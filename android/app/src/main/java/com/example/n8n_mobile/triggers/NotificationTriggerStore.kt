package com.example.n8n_mobile.triggers

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.json.JSONArray
import java.io.File

class NotificationTriggerStore(context: Context) {
    private val file = File(context.filesDir, "notification_triggers.json")
    private val _items = MutableStateFlow(load())
    val items: StateFlow<List<NotificationTrigger>> = _items

    fun add(t: NotificationTrigger) {
        _items.value = _items.value + t
        persist()
    }

    fun remove(id: String) {
        _items.value = _items.value.filterNot { it.id == id }
        persist()
    }

    fun snapshot(): List<NotificationTrigger> = _items.value

    private fun load(): List<NotificationTrigger> {
        if (!file.exists()) return emptyList()
        val arr = JSONArray(file.readText())
        return List(arr.length()) { NotificationTrigger.fromJson(arr.getJSONObject(it)) }
    }

    private fun persist() {
        val arr = JSONArray()
        _items.value.forEach { arr.put(it.toJson()) }
        file.writeText(arr.toString())
    }

    companion object {
        @Volatile
        private var instance: NotificationTriggerStore? = null
        fun get(context: Context): NotificationTriggerStore =
            instance ?: synchronized(this) {
                instance ?: NotificationTriggerStore(context.applicationContext).also { instance = it }
            }
    }
}
