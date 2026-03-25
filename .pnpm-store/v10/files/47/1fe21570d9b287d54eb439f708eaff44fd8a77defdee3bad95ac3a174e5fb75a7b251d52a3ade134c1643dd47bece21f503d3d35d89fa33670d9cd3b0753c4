{
	'targets': [
		{
			'target_name': 'isolated-native-example',
			'cflags_cc!': [ '-fno-exceptions' ],
			'xcode_settings': {
				'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
			},
			'msvs_settings': {
				'VCCLCompilerTool': {
					'ExceptionHandling': '1',
				},
			},
			'include_dirs': [
				'<!(node -e "require(\'nan\')")',
				'<!(node -e "require(\'isolated-vm/include\')")',
			],
			'sources': [
				'example.cc',
			],
		},
	],
}
