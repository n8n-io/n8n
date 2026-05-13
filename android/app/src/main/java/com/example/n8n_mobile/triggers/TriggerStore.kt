package com.example.n8n_mobile.triggers

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.json.JSONArray
import java.io.File

class TriggerStore(context: Context) {
    private val file = File(context.filesDir, "triggers.json")
    private val _triggers = MutableStateFlow(load())
    val triggers: StateFlow<List<GeofenceTrigger>> = _triggers

    fun add(trigger: GeofenceTrigger) {
        _triggers.value = _triggers.value + trigger
        persist()
    }

    fun remove(id: String) {
        _triggers.value = _triggers.value.filterNot { it.id == id }
        persist()
    }

    fun get(id: String): GeofenceTrigger? = _triggers.value.firstOrNull { it.id == id }

    private fun load(): List<GeofenceTrigger> {
        if (!file.exists()) return emptyList()
        val arr = JSONArray(file.readText())
        return List(arr.length()) { GeofenceTrigger.fromJson(arr.getJSONObject(it)) }
    }

    private fun persist() {
        val arr = JSONArray()
        _triggers.value.forEach { arr.put(it.toJson()) }
        file.writeText(arr.toString())
    }

    companion object {
        @Volatile
        private var instance: TriggerStore? = null
        fun get(context: Context): TriggerStore =
            instance ?: synchronized(this) {
                instance ?: TriggerStore(context.applicationContext).also { instance = it }
            }
    }
}
