package com.example.n8n_mobile.triggers

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.FilterChip
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource

@Composable
fun TriggersScreen() {
    val context = LocalContext.current
    val store = remember { TriggerStore.get(context) }
    val manager = remember { GeofenceManager(context) }
    val triggers by store.triggers.collectAsState()

    var hasFine by remember { mutableStateOf(checkFine(context)) }
    var hasBackground by remember { mutableStateOf(checkBackground(context)) }

    val fineLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted -> hasFine = granted }
    val backgroundLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted -> hasBackground = granted }

    LaunchedEffect(Unit) {
        if (!hasFine) fineLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
    }

    // Re-check permissions whenever we come back to the foreground — handles the
    // case where the user grants background location via system Settings.
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                hasFine = checkFine(context)
                hasBackground = checkBackground(context)
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        Text("Triggers", style = androidx.compose.material3.MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(8.dp))

        PermissionRow(
            hasFine = hasFine,
            hasBackground = hasBackground,
            onRequestFine = { fineLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION) },
            onRequestBackground = {
                if (Build.VERSION.SDK_INT >= 29) {
                    backgroundLauncher.launch(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
                }
            },
            onOpenSettings = {
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.fromParts("package", context.packageName, null)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
            },
        )

        if (hasFine && !hasBackground) {
            Spacer(Modifier.height(4.dp))
            Text(
                "Triggers only fire while the app is open until you grant background location " +
                    "(\"Allow all the time\") in app settings.",
                style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
            )
        }

        Spacer(Modifier.height(16.dp))
        HorizontalDivider()
        Spacer(Modifier.height(16.dp))

        AddTriggerForm(
            enabled = hasFine,
            onAdd = { trigger ->
                store.add(trigger)
                if (hasFine) manager.register(trigger)
            },
            onPickCurrentLocation = { onStatus, onResult ->
                if (!hasFine) {
                    onStatus("Grant location permission first")
                    return@AddTriggerForm
                }
                fetchCurrentLocation(context, onStatus, onResult)
            },
        )

        Spacer(Modifier.height(16.dp))
        HorizontalDivider()
        Spacer(Modifier.height(16.dp))

        Text("Registered (${triggers.size})", fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(8.dp))

        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            triggers.forEach { trigger ->
                key(trigger.id) {
                    TriggerCard(
                        trigger = trigger,
                        onDelete = {
                            manager.unregister(trigger.id)
                            store.remove(trigger.id)
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun PermissionRow(
    hasFine: Boolean,
    hasBackground: Boolean,
    onRequestFine: () -> Unit,
    onRequestBackground: () -> Unit,
    onOpenSettings: () -> Unit,
) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        AssistChip(
            onClick = onRequestFine,
            label = { Text(if (hasFine) "Fine ✓" else "Grant fine location") },
        )
        AssistChip(
            // On Android 11+ launching the request opens the Location permission page directly,
            // which is the only way to enable "Allow all the time". On older versions it shows
            // the in-app dialog. Either way the launcher is the right call.
            onClick = onRequestBackground,
            label = { Text(if (hasBackground) "Background ✓" else "Grant background") },
        )
        if (!hasBackground) {
            AssistChip(
                onClick = onOpenSettings,
                label = { Text("App settings") },
            )
        }
    }
}

@Composable
private fun AddTriggerForm(
    enabled: Boolean,
    onAdd: (GeofenceTrigger) -> Unit,
    onPickCurrentLocation: (onStatus: (String?) -> Unit, onResult: (Double, Double) -> Unit) -> Unit,
) {
    var name by remember { mutableStateOf("") }
    var lat by remember { mutableStateOf("") }
    var lng by remember { mutableStateOf("") }
    var radius by remember { mutableStateOf("150") }
    var transition by remember { mutableStateOf(Transition.ENTER) }
    var workflowId by remember { mutableStateOf("") }
    var url by remember { mutableStateOf("") }
    var locationStatus by remember { mutableStateOf<String?>(null) }

    val fillFromCurrent: () -> Unit = {
        onPickCurrentLocation(
            { status -> locationStatus = status },
            { gotLat, gotLng ->
                lat = gotLat.toString()
                lng = gotLng.toString()
            },
        )
    }

    LaunchedEffect(enabled) {
        if (enabled && lat.isBlank() && lng.isBlank()) fillFromCurrent()
    }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("New geofence trigger", fontWeight = FontWeight.SemiBold)
        OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Name") }, modifier = Modifier.fillMaxWidth())
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = lat, onValueChange = { lat = it }, label = { Text("Latitude") },
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.weight(1f),
            )
            OutlinedTextField(
                value = lng, onValueChange = { lng = it }, label = { Text("Longitude") },
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.weight(1f),
            )
        }
        TextButton(
            enabled = enabled,
            onClick = fillFromCurrent,
        ) { Text("Reset to current location") }
        locationStatus?.let { status ->
            Text(
                status,
                style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
            )
        }

        OutlinedTextField(
            value = radius, onValueChange = { radius = it }, label = { Text("Radius (m, min 100)") },
            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
            modifier = Modifier.fillMaxWidth(),
        )

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Transition.values().forEach { t ->
                FilterChip(
                    selected = transition == t,
                    onClick = { transition = t },
                    label = { Text(t.name) },
                )
            }
        }

        OutlinedTextField(value = workflowId, onValueChange = { workflowId = it }, label = { Text("Workflow id") }, modifier = Modifier.fillMaxWidth())

        OutlinedTextField(
            value = url,
            onValueChange = { url = it },
            label = { Text("Webhook URL") },
            placeholder = { Text("https://...") },
            singleLine = true,
            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Uri),
            modifier = Modifier.fillMaxWidth(),
        )

        Button(
            enabled = enabled && name.isNotBlank() && lat.toDoubleOrNull() != null && lng.toDoubleOrNull() != null
                && (radius.toFloatOrNull() ?: 0f) >= 100f && workflowId.isNotBlank()
                && url.trim().let { it.startsWith("http://") || it.startsWith("https://") },
            onClick = {
                val trigger = GeofenceTrigger(
                    name = name.trim(),
                    latitude = lat.toDouble(),
                    longitude = lng.toDouble(),
                    radiusM = radius.toFloat(),
                    transition = transition,
                    workflowId = workflowId.trim(),
                    url = url.trim(),
                )
                onAdd(trigger)
                name = ""; lat = ""; lng = ""; radius = "150"; workflowId = ""; url = ""; transition = Transition.ENTER
                if (enabled) fillFromCurrent()
            },
        ) { Text("Add trigger") }
    }
}

@Composable
private fun TriggerCard(trigger: GeofenceTrigger, onDelete: () -> Unit) {
    Card(
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth().padding(12.dp),
        ) {
            Column(Modifier.weight(1f)) {
                Text(trigger.name, fontWeight = FontWeight.SemiBold)
                Text(
                    "${trigger.transition.name} · ${trigger.latitude}, ${trigger.longitude} · ${trigger.radiusM.toInt()}m → ${trigger.workflowId}",
                    style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
                )
                if (trigger.url.isNotBlank()) {
                    Text(
                        trigger.url,
                        style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
                    )
                }
            }
            TextButton(onClick = onDelete) { Text("Delete") }
        }
    }
}

private fun checkFine(context: android.content.Context): Boolean =
    ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED

private fun checkBackground(context: android.content.Context): Boolean =
    if (Build.VERSION.SDK_INT < 29) true
    else ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED

@SuppressLint("MissingPermission")
private fun fetchCurrentLocation(
    context: android.content.Context,
    onStatus: (String?) -> Unit,
    onResult: (Double, Double) -> Unit,
) {
    val client = LocationServices.getFusedLocationProviderClient(context)
    onStatus("Fetching location...")
    client.lastLocation
        .addOnSuccessListener { cached ->
            if (cached != null) {
                onStatus(null)
                onResult(cached.latitude, cached.longitude)
                return@addOnSuccessListener
            }
            // No cached fix (common on emulator). Force a fresh one.
            val cts = CancellationTokenSource()
            client.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cts.token)
                .addOnSuccessListener { fresh ->
                    if (fresh != null) {
                        onStatus(null)
                        onResult(fresh.latitude, fresh.longitude)
                    } else {
                        onStatus("No location available. Set one in the emulator's Extended Controls → Location.")
                    }
                }
                .addOnFailureListener { e ->
                    Log.e("TriggersScreen", "getCurrentLocation failed", e)
                    onStatus("Location failed: ${e.message}")
                }
        }
        .addOnFailureListener { e ->
            Log.e("TriggersScreen", "lastLocation failed", e)
            onStatus("Location failed: ${e.message}")
        }
}
