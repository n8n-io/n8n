package com.example.n8n_mobile

import android.content.Context
import java.io.File

object NodeRunner {
    fun start(
        context: Context,
        entrypoint: File,
        env: Map<String, String> = emptyMap(),
        cwd: File? = null,
    ): Process {
        val nativeDir = File(context.applicationInfo.nativeLibraryDir)
        val nodeBin = File(nativeDir, "libnode.so")
        val pb = ProcessBuilder(nodeBin.absolutePath, entrypoint.absolutePath)
        cwd?.let { pb.directory(it) }
        val e = pb.environment()
        for ((k, v) in env) e[k] = v
        if (!e.containsKey("LD_LIBRARY_PATH")) e["LD_LIBRARY_PATH"] = nativeDir.absolutePath
        pb.redirectErrorStream(true)
        return pb.start()
    }
}
