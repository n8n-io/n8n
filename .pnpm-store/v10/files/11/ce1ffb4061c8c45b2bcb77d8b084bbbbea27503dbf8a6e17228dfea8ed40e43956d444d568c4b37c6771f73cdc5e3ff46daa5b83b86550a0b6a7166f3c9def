{
  "targets": [
    {
      "target_name": "tree_sitter_runtime_binding",
      "dependencies": [
          "tree_sitter",
          "<!(node -p \"require('node-addon-api').targets\"):node_addon_api_except",
      ],
      "sources": [
        "src/binding.cc",
        "src/conversions.cc",
        "src/language.cc",
        "src/logger.cc",
        "src/lookaheaditerator.cc",
        "src/node.cc",
        "src/parser.cc",
        "src/query.cc",
        "src/tree.cc",
        "src/tree_cursor.cc",
      ],
      "include_dirs": [
        "vendor/tree-sitter/lib/include",
      ],
      "defines": [
        "NAPI_VERSION=<(napi_build_version)",
      ],
      "cflags": [
        "-std=c++17"
      ],
      "cflags_cc": [
        "-std=c++17"
      ],
      "conditions": [
        ["OS=='mac'", {
          "xcode_settings": {
            "GCC_SYMBOLS_PRIVATE_EXTERN": "YES", # -fvisibility=hidden
            "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
            "MACOSX_DEPLOYMENT_TARGET": "10.9",
          },
        }],
        ["OS=='win'", {
          "msvs_settings": {
            "VCCLCompilerTool": {
              "AdditionalOptions": [
                "/std:c++17",
              ],
              "RuntimeLibrary": 0,
            },
          },
        }],
        ["OS == 'linux'", {
          "cflags_cc": [
            "-Wno-cast-function-type"
          ]
        }],
      ]
    },
    {
      "target_name": "tree_sitter",
      "type": "static_library",
      "sources": [
        "vendor/tree-sitter/lib/src/lib.c"
      ],
      "include_dirs": [
        "vendor/tree-sitter/lib/src",
        "vendor/tree-sitter/lib/include",
      ],
      "cflags": [
        "-std=c11"
      ]
    }
  ],
  "variables": {
    "runtime%": "node",
    "openssl_fips": "",
    "v8_enable_pointer_compression%": 0,
    "v8_enable_31bit_smis_on_64bit_arch%": 0,
  }
}
