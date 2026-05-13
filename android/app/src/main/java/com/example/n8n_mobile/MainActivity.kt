package com.example.n8n_mobile

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import com.example.n8n_mobile.triggers.TriggersScreen

private enum class Tab { Workflows, Triggers }

class MainActivity : ComponentActivity() {

    private val readyReceiver = object : BroadcastReceiver() {
        override fun onReceive(c: Context?, i: Intent?) { ServerClient.refreshState() }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ContextCompat.registerReceiver(
            this,
            readyReceiver,
            IntentFilter(NodeService.ACTION_READY),
            ContextCompat.RECEIVER_NOT_EXPORTED,
        )
        setContent {
            var tab by remember { mutableStateOf(Tab.Workflows) }
            Surface(modifier = Modifier.fillMaxSize()) {
                Scaffold(
                    modifier = Modifier
                        .fillMaxSize()
                        .windowInsetsPadding(WindowInsets.systemBars),
                    bottomBar = {
                        NavigationBar {
                            NavigationBarItem(
                                selected = tab == Tab.Workflows,
                                onClick = { tab = Tab.Workflows },
                                icon = {},
                                label = { Text("Workflows") },
                            )
                            NavigationBarItem(
                                selected = tab == Tab.Triggers,
                                onClick = { tab = Tab.Triggers },
                                icon = {},
                                label = { Text("Triggers") },
                            )
                        }
                    },
                ) { padding ->
                    Box(Modifier.fillMaxSize().padding(padding)) {
                        // Always compose TestScreen so its WebView (and the SSE connection
                        // to /events) stays alive across tab switches. Triggers overlays it.
                        TestScreen()
                        if (tab == Tab.Triggers) {
                            val interactionSource = remember { MutableInteractionSource() }
                            Surface(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .clickable(
                                        interactionSource = interactionSource,
                                        indication = null,
                                    ) {},
                                color = MaterialTheme.colorScheme.background,
                            ) {
                                TriggersScreen()
                            }
                        }
                    }
                }
            }
        }
    }

    override fun onStart() {
        super.onStart()
        ServerClient.notifyForeground(true)
    }

    override fun onStop() {
        super.onStop()
        ServerClient.notifyForeground(false)
    }

    override fun onDestroy() {
        runCatching { unregisterReceiver(readyReceiver) }
        super.onDestroy()
    }
}
