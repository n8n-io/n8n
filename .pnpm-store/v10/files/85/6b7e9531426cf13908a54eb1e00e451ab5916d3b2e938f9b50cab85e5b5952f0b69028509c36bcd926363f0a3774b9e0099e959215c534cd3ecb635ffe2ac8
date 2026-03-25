{
  'targets': [
    {
      'target_name': 'cpu_features',
      'type': 'static_library',

      'cflags': [ '-O3' ],

      'include_dirs': [
        'include',
        'include/internal',
      ],
      'sources': [
        'include/cpu_features_cache_info.h',
        'include/cpu_features_macros.h',

        # platform-specific cpu checking implementations
        'src/impl_aarch64_linux_or_android.c',
        'src/impl_aarch64_macos_or_iphone.c',
        'src/impl_aarch64_windows.c',
        'src/impl_arm_linux_or_android.c',
        'src/impl_mips_linux_or_android.c',
        'src/impl_ppc_linux.c',
        'src/impl_x86_freebsd.c',
        'src/impl_x86_linux_or_android.c',
        'src/impl_x86_macos.c',
        'src/impl_x86_windows.c',

        # utils
        'include/internal/bit_utils.h',
        'include/internal/filesystem.h',
        'include/internal/stack_line_reader.h',
        'include/internal/string_view.h',
        'src/filesystem.c',
        'src/stack_line_reader.c',
        'src/string_view.c',
      ],
      'conditions': [
        ['target_arch in "mips mipsel mips64 mips64el"', {
          'sources': [
            'include/cpuinfo_mips.h',
          ],
        }],
        ['target_arch=="arm"', {
          'sources': [
            'include/cpuinfo_arm.h',
          ],
        }],
        ['target_arch=="arm64"', {
          'sources': [
            'include/cpuinfo_aarch64.h',
            'include/internal/windows_utils.h',
          ],
        }],
        ['target_arch in "ia32 x32 x64"', {
          'sources': [
            'include/internal/cpuid_x86.h',
            'include/cpuinfo_x86.h',
            'include/internal/windows_utils.h',
          ],
        }],
        ['target_arch in "ppc ppc64"', {
          'sources': [
            'include/cpuinfo_ppc.h',
          ],
        }],
        ['target_arch in "s390x"', {
          'sources': [
            'include/cpuinfo_s390x.h',
          ],
        }],
        ['target_arch in "riscv64"', {
          'sources': [
            'include/cpuinfo_riscv.h',
          ],
        }],

        ['OS=="mac" and target_arch in "ia32 x32 x64 arm64"', {
          'defines': [
            'HAVE_SYSCTLBYNAME=1',
          ],
        }],
      ],
      'defines': [
        'NDEBUG',
        'STACK_LINE_READER_BUFFER_SIZE=1024',
      ],

      # Use generated config
      'includes': [
        '../../buildcheck.gypi',
      ],

      'direct_dependent_settings': {
        'include_dirs': [
          'include',
        ],
        'defines': [
          # Manually-tracked git revision
          'CPU_FEATURES_VERSION_REV=8a494eb1e158ec2050e5f699a504fbc9b896a43b',
        ],
      },
    },
  ],
}
