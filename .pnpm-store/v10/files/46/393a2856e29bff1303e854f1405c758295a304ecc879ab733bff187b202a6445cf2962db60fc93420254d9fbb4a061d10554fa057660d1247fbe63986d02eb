{
	'target_defaults': {
		'default_configuration': 'Release',
		'configurations': {
			'Common': {
				'cflags_cc': [ '-std=c++20', '-g', '-Wno-unknown-pragmas' ],
				'cflags_cc!': [ '-fno-exceptions' ],
				'include_dirs': [ './src', './vendor' ],
				'xcode_settings': {
					'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
					'GCC_GENERATE_DEBUGGING_SYMBOLS': 'YES',
					'CLANG_CXX_LANGUAGE_STANDARD': 'c++20',
					'MACOSX_DEPLOYMENT_TARGET': '10.12',
				},
				'msvs_settings': {
					'VCCLCompilerTool': {
						'AdditionalOptions': [ '-std:c++20' ],
						'ExceptionHandling': '1',
					},
				},
				'msvs_disabled_warnings': [
					4101, # Unreferenced local (msvc fires these for ignored exception)
					4068, # Unknown pragma
				],
				'conditions': [
					[ 'OS == "win"', { 'defines': [ 'NOMSG', 'NOMINMAX', 'WIN32_LEAN_AND_MEAN' ] } ],
				],
			},
			'Release': {
				'inherit_from': [ 'Common' ],
				'cflags': [ '-Wno-deprecated-declarations' ],
				'xcode_settings': {
					'GCC_OPTIMIZATION_LEVEL': '3',
					'OTHER_CFLAGS': [ '-Wno-deprecated-declarations' ],
				},
				'msvs_disabled_warnings': [
					4996, # Deprecation
				],
			},
			'Debug': {
				'inherit_from': [ 'Common' ],
				'defines': [ 'V8_IMMINENT_DEPRECATION_WARNINGS' ],
			},
		},
	},
	'targets': [
		{
			'target_name': 'isolated_vm',
			'cflags_cc!': [ '-fno-rtti' ],
			'xcode_settings': {
				'GCC_ENABLE_CPP_RTTI': 'YES',
			},
			# nb: For whatever reason this msvs setting cannot be inherited and must be directly set on
			# each target
			'configurations': {
				'Debug': {
					'msvs_settings': {
						'VCCLCompilerTool': { 'RuntimeTypeInfo': 'true' },
					},
				},
				'Release': {
					'msvs_settings': {
						'VCCLCompilerTool': { 'RuntimeTypeInfo': 'true' },
					},
				},
			},
			'conditions': [
				[ 'OS == "linux"', { 'defines': [ 'USE_CLOCK_THREAD_CPUTIME_ID' ] } ],
			],
			'sources': [
				'src/external_copy/external_copy.cc',
				'src/external_copy/serializer.cc',
				'src/external_copy/serializer_nortti.cc',
				'src/external_copy/string.cc',
				'src/isolate/allocator_nortti.cc',
				'src/isolate/environment.cc',
				'src/isolate/cpu_profile_manager.cc',
				'src/isolate/executor.cc',
				'src/isolate/holder.cc',
				'src/isolate/inspector.cc',
				'src/isolate/platform_delegate.cc',
				'src/isolate/scheduler.cc',
				'src/isolate/stack_trace.cc',
				'src/isolate/three_phase_task.cc',
				'src/lib/thread_pool.cc',
				'src/lib/timer.cc',
				'src/module/callback.cc',
				'src/module/context_handle.cc',
				'src/module/evaluation.cc',
				'src/module/external_copy_handle.cc',
				'src/module/isolate.cc',
				'src/module/isolate_handle.cc',
				'src/module/lib_handle.cc',
				'src/module/module_handle.cc',
				'src/module/native_module_handle.cc',
				'src/module/reference_handle.cc',
				'src/module/script_handle.cc',
				'src/module/session_handle.cc',
				'src/module/transferable.cc'
			],
			'conditions': [
				[ 'OS != "win"', {
					'dependencies': [ 'nortti' ],
					'sources/': [ [ 'exclude', '_nortti\\.cc$'] ],
				} ],
			],
			'libraries': [
				'<!@(node -e "process.config.target_defaults.libraries.map(flag=>console.log(flag))")'
			],
		},
		{
			'target_name': 'nortti',
			'type': 'static_library',
			'sources': [
				'src/external_copy/serializer_nortti.cc',
				'src/isolate/allocator_nortti.cc',
			],
		},
		{
			'target_name': 'action_after_build',
			'type': 'none',
			'dependencies': [ 'isolated_vm' ],
			'copies': [ {
				'files': [ '<(PRODUCT_DIR)/isolated_vm.node' ],
				'destination': 'out',
			} ],
		},
	],
}
