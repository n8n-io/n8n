package com.example.n8n_mobile

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.view.ViewGroup
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat

@Composable
fun TestScreen() {
    val context = LocalContext.current
    var port by remember { mutableStateOf(NodeService.listeningPort) }
    val pendingFileCallback = remember { mutableStateOf<ValueCallback<Array<Uri>>?>(null) }

    val notifLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { /* proceed either way */ }

    val pickJson = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri ->
        pendingFileCallback.value?.onReceiveValue(if (uri != null) arrayOf(uri) else null)
        pendingFileCallback.value = null
    }

    LaunchedEffect(Unit) {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
            != PackageManager.PERMISSION_GRANTED
        ) {
            notifLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    DisposableEffect(Unit) {
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(c: Context?, i: Intent?) {
                val p = i?.getIntExtra(NodeService.EXTRA_PORT, -1) ?: -1
                if (p > 0) port = p
            }
        }
        ContextCompat.registerReceiver(
            context,
            receiver,
            IntentFilter(NodeService.ACTION_READY),
            ContextCompat.RECEIVER_NOT_EXPORTED
        )
        NodeService.start(context)
        onDispose { context.unregisterReceiver(receiver) }
    }

    Column(Modifier.fillMaxSize()) {
        Image(
            painter = painterResource(R.drawable.n8n_logo),
            contentDescription = "n8n",
            contentScale = ContentScale.Fit,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
                .padding(vertical = 8.dp)
                .wrapContentWidth(Alignment.CenterHorizontally)
        )
        Box(
            Modifier
                .weight(1f)
                .fillMaxWidth()
        ) {
            AndroidView(
                factory = { ctx ->
                    // Expose this WebView to chrome://inspect so we can see JS errors.
                    WebView.setWebContentsDebuggingEnabled(true)
                    WebView(ctx).apply {
                        // AndroidView defaults height to WRAP_CONTENT, which gives the WebView
                        // an internal viewport of 0 — so window.innerHeight is 0 and n8n's
                        // 100%/100vh CSS collapses to 0. Force MATCH_PARENT so JS sees the
                        // real layout size.
                        layoutParams = ViewGroup.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT,
                        )
                        settings.javaScriptEnabled = true
                        settings.domStorageEnabled = true
                        settings.databaseEnabled = true
                        settings.allowFileAccess = true
                        settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                        // n8n's editor is built for desktop; the default Android WebView UA
                        // contains "Mobile"/"wv" which can flip the SPA into a layout that
                        // collapses to 0 height. Force a desktop Chrome UA.
                        settings.userAgentString =
                            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
                                "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                        settings.useWideViewPort = true
                        settings.loadWithOverviewMode = true
                        webViewClient = object : WebViewClient() {
                            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                                Log.d("WebView", "onPageStarted url=$url")
                            }

                            override fun onPageFinished(view: WebView?, url: String?) {
                                Log.d("WebView", "onPageFinished url=$url title='${view?.title}'")
                            }

                            override fun onReceivedError(
                                view: WebView?,
                                request: WebResourceRequest?,
                                error: WebResourceError?
                            ) {
                                Log.e("WebView", "load error ${error?.errorCode}: ${error?.description} url=${request?.url}")
                            }

                            override fun onReceivedHttpError(
                                view: WebView?,
                                request: WebResourceRequest?,
                                errorResponse: WebResourceResponse?
                            ) {
                                Log.e("WebView", "http ${errorResponse?.statusCode} for ${request?.url}")
                            }
                        }
                        webChromeClient = object : WebChromeClient() {
                            override fun onConsoleMessage(msg: ConsoleMessage): Boolean {
                                Log.d("WebViewConsole", "${msg.messageLevel()} ${msg.sourceId()}:${msg.lineNumber()} ${msg.message()}")
                                return true
                            }

                            override fun onShowFileChooser(
                                webView: WebView?,
                                callback: ValueCallback<Array<Uri>>?,
                                params: FileChooserParams?
                            ): Boolean {
                                Log.d("WebView", "onShowFileChooser acceptTypes=${params?.acceptTypes?.joinToString()}")
                                pendingFileCallback.value?.onReceiveValue(null)
                                pendingFileCallback.value = callback
                                return try {
                                    pickJson.launch("*/*")
                                    true
                                } catch (e: Exception) {
                                    Log.e("WebView", "picker launch failed", e)
                                    pendingFileCallback.value = null
                                    callback?.onReceiveValue(null)
                                    false
                                }
                            }
                        }
                    }
                },
                update = { wv ->
                    val p = port ?: return@AndroidView
                    val url = "http://127.0.0.1:$p/"
                    if (wv.url != url) wv.loadUrl(url)
                },
                modifier = Modifier.fillMaxSize()
            )
            if (port == null) {
                val progress by NodeStartupState.progress.collectAsState()
                Column(
                    modifier = Modifier
                        .padding(16.dp)
                        .fillMaxWidth(),
                ) {
                    val label = when (val p = progress) {
                        is NodeStartupState.Progress.Extracting ->
                            "Extracting Node project... ${(p.percent * 100).toInt()}% (${p.entries} files)"
                        NodeStartupState.Progress.Starting -> "Starting Node..."
                        null -> "Initializing..."
                    }
                    Text(label, fontFamily = FontFamily.Monospace)
                    when (val p = progress) {
                        is NodeStartupState.Progress.Extracting -> LinearProgressIndicator(
                            progress = { p.percent },
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 8.dp),
                        )
                        else -> LinearProgressIndicator(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 8.dp),
                        )
                    }
                }
            }
        }
    }
}
