package com.example.n8n_mobile.tunnel

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun TunnelScreen() {
    val context = LocalContext.current

    LaunchedEffect(Unit) { TunnelManager.init(context) }

    val status by TunnelManager.status.collectAsState()
    val publicKey by TunnelManager.publicKey.collectAsState()
    val subdomain by TunnelManager.subdomain.collectAsState()

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("Tunnel", style = MaterialTheme.typography.headlineSmall)

        subdomain?.let {
            Column {
                Text("Subdomain", style = MaterialTheme.typography.labelMedium)
                Text(it, fontFamily = FontFamily.Monospace)
            }
        }

        Column {
            Text("Status", style = MaterialTheme.typography.labelMedium)
            when (val s = status) {
                TunnelManager.Status.Idle -> Text("Not connected")
                TunnelManager.Status.Connecting -> Text("Connecting…")
                is TunnelManager.Status.Connected -> {
                    Text("Connected", fontWeight = FontWeight.SemiBold)
                    SelectionContainer { Text(s.url, fontFamily = FontFamily.Monospace) }
                }
                is TunnelManager.Status.Error -> Text(
                    "Error: ${s.message}",
                    color = MaterialTheme.colorScheme.error,
                )
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = { TunnelManager.connect(context) }) { Text("Connect") }
            OutlinedButton(onClick = { TunnelManager.disconnect() }) { Text("Disconnect") }
        }

    }
}
