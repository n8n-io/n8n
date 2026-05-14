package com.example.n8n_mobile.triggers

import android.content.Intent
import android.provider.Settings
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun NotificationsScreen() {
    val context = LocalContext.current
    val store = remember { NotificationTriggerStore.get(context) }
    val triggers by store.items.collectAsState()

    var name by remember { mutableStateOf("") }
    var pkg by remember { mutableStateOf("com.android.shell") }
    var titleRx by remember { mutableStateOf(".*") }
    var textRx by remember { mutableStateOf(".*") }
    var url by remember { mutableStateOf("") }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Notification triggers", style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(4.dp))
        Text(
            "Fires when another app posts a notification matching the filters below. " +
                "Requires Notification Access in Settings.",
            style = MaterialTheme.typography.bodySmall,
        )
        Spacer(Modifier.height(8.dp))

        AssistChip(
            onClick = {
                context.startActivity(
                    Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                )
            },
            label = { Text("Grant notification access") },
        )

        Spacer(Modifier.height(16.dp))
        HorizontalDivider()
        Spacer(Modifier.height(16.dp))

        Text("New trigger", fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(8.dp))

        OutlinedTextField(
            value = name, onValueChange = { name = it },
            label = { Text("Name") }, modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = pkg, onValueChange = { pkg = it },
            label = { Text("Package name") },
            // com.android.shell is the package adb uses for `cmd notification post`, handy for demos.
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = titleRx, onValueChange = { titleRx = it },
            label = { Text("Title regex") }, modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = textRx, onValueChange = { textRx = it },
            label = { Text("Text regex") }, modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = url, onValueChange = { url = it },
            label = { Text("Webhook URL") }, modifier = Modifier.fillMaxWidth(),
        )

        Spacer(Modifier.height(8.dp))
        Button(
            enabled = name.isNotBlank() && pkg.isNotBlank() &&
                (url.startsWith("http://") || url.startsWith("https://")),
            onClick = {
                store.add(
                    NotificationTrigger(
                        name = name.trim(),
                        packageName = pkg.trim(),
                        titleRegex = titleRx.ifBlank { ".*" },
                        textRegex = textRx.ifBlank { ".*" },
                        url = url.trim(),
                    )
                )
                name = ""; titleRx = ".*"; textRx = ".*"; url = ""
            },
        ) { Text("Add notification trigger") }

        Spacer(Modifier.height(16.dp))
        HorizontalDivider()
        Spacer(Modifier.height(8.dp))
        Text("Active (${triggers.size})", fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(8.dp))

        LazyColumn(
            Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(triggers, key = { it.id }) { t ->
                Card(shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                    Row(Modifier.fillMaxWidth().padding(12.dp)) {
                        Column(Modifier.weight(1f)) {
                            Text(t.name, fontWeight = FontWeight.SemiBold)
                            Text(
                                "${t.packageName} · title=/${t.titleRegex}/ · text=/${t.textRegex}/",
                                style = MaterialTheme.typography.bodySmall,
                            )
                            Text(t.url, style = MaterialTheme.typography.bodySmall)
                        }
                        TextButton(onClick = { store.remove(t.id) }) { Text("Delete") }
                    }
                }
            }
        }
    }
}
