# Copyright (c) 2012 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

{
  'variables': {
    'chromium_code': 1,
    # Override to dynamically link the PulseAudio library.
    'use_pulseaudio%': 0,
    # Override to dynamically link the cras (ChromeOS audio) library.
    'use_cras%': 0,
  },
  'targets': [
    {
      'target_name': 'media',
      'type': '<(component)',
      'dependencies': [
        'yuv_convert',
        '../base/base.gyp:base',
        '../base/third_party/dynamic_annotations/dynamic_annotations.gyp:dynamic_annotations',
        '../build/temp_gyp/googleurl.gyp:googleurl',
        '../crypto/crypto.gyp:crypto',
        '../third_party/openmax/openmax.gyp:il',
        '../ui/ui.gyp:ui',
      ],
      'defines': [
        'MEDIA_IMPLEMENTATION',
      ],
      'include_dirs': [
        '..',
      ],
      'sources': [
        'audio/android/audio_manager_android.cc',
        'audio/android/audio_manager_android.h',
        'audio/android/audio_track_output_android.cc',
        'audio/android/audio_track_output_android.h',
        'audio/android/opensles_input.cc',
        'audio/android/opensles_input.h',
        'audio/android/opensles_output.cc',
        'audio/android/opensles_output.h',
        'audio/async_socket_io_handler.h',
        'audio/async_socket_io_handler_posix.cc',
        'audio/async_socket_io_handler_win.cc',
        'audio/audio_buffers_state.cc',
        'audio/audio_buffers_state.h',
        'audio/audio_io.h',
        'audio/audio_input_controller.cc',
        'audio/audio_input_controller.h',
        'audio/audio_input_stream_impl.cc',
        'audio/audio_input_stream_impl.h',
        'audio/audio_device_name.cc',
        'audio/audio_device_name.h',
        'audio/audio_manager.cc',
        'audio/audio_manager.h',
        'audio/audio_manager_base.cc',
        'audio/audio_manager_base.h',
        'audio/audio_output_controller.cc',
        'audio/audio_output_controller.h',
        'audio/audio_output_dispatcher.cc',
        'audio/audio_output_dispatcher.h',
        'audio/audio_output_dispatcher_impl.cc',
        'audio/audio_output_dispatcher_impl.h',
        'audio/audio_output_mixer.cc',
        'audio/audio_output_mixer.h',
        'audio/audio_output_proxy.cc',
        'audio/audio_output_proxy.h',
        'audio/audio_parameters.cc',
        'audio/audio_parameters.h',
        'audio/audio_util.cc',
        'audio/audio_util.h',
        'audio/cross_process_notification.cc',
        'audio/cross_process_notification.h',
        'audio/cross_process_notification_win.cc',
        'audio/cross_process_notification_posix.cc',
        'audio/fake_audio_input_stream.cc',
        'audio/fake_audio_input_stream.h',
        'audio/fake_audio_output_stream.cc',
        'audio/fake_audio_output_stream.h',
        'audio/linux/audio_manager_linux.cc',
        'audio/linux/audio_manager_linux.h',
        'audio/linux/alsa_input.cc',
        'audio/linux/alsa_input.h',
        'audio/linux/alsa_output.cc',
        'audio/linux/alsa_output.h',
        'audio/linux/alsa_util.cc',
        'audio/linux/alsa_util.h',
        'audio/linux/alsa_wrapper.cc',
        'audio/linux/alsa_wrapper.h',
        'audio/linux/cras_output.cc',
        'audio/linux/cras_output.h',
        'audio/openbsd/audio_manager_openbsd.cc',
        'audio/openbsd/audio_manager_openbsd.h',
        'audio/mac/audio_input_mac.cc',
        'audio/mac/audio_input_mac.h',
        'audio/mac/audio_low_latency_input_mac.cc',
        'audio/mac/audio_low_latency_input_mac.h',
        'audio/mac/audio_low_latency_output_mac.cc',
        'audio/mac/audio_low_latency_output_mac.h',
        'audio/mac/audio_manager_mac.cc',
        'audio/mac/audio_manager_mac.h',
        'audio/mac/audio_output_mac.cc',
        'audio/mac/audio_output_mac.h',
        'audio/null_audio_sink.cc',
        'audio/null_audio_sink.h',
        'audio/pulse/pulse_output.cc',
        'audio/pulse/pulse_output.h',
        'audio/sample_rates.cc',
        'audio/sample_rates.h',
        'audio/simple_sources.cc',
        'audio/simple_sources.h',
        'audio/win/audio_low_latency_input_win.cc',
        'audio/win/audio_low_latency_input_win.h',
        'audio/win/audio_low_latency_output_win.cc',
        'audio/win/audio_low_latency_output_win.h',
        'audio/win/audio_manager_win.cc',
        'audio/win/audio_manager_win.h',
        'audio/win/avrt_wrapper_win.cc',
        'audio/win/avrt_wrapper_win.h',
        'audio/win/device_enumeration_win.cc',
        'audio/win/device_enumeration_win.h',
        'audio/win/wavein_input_win.cc',
        'audio/win/wavein_input_win.h',
        'audio/win/waveout_output_win.cc',
        'audio/win/waveout_output_win.h',
        'base/android/media_jni_registrar.cc',
        'base/android/media_jni_registrar.h',
        'base/audio_decoder.cc',
        'base/audio_decoder.h',
        'base/audio_decoder_config.cc',
        'base/audio_decoder_config.h',
        'base/audio_renderer.h',
        'base/audio_renderer_mixer.cc',
        'base/audio_renderer_mixer.h',
        'base/audio_renderer_mixer_input.cc',
        'base/audio_renderer_mixer_input.h',
        'base/bitstream_buffer.h',
        'base/buffers.cc',
        'base/buffers.h',
        'base/byte_queue.cc',
        'base/byte_queue.h',
        'base/channel_layout.cc',
        'base/channel_layout.h',
        'base/clock.cc',
        'base/clock.h',
        'base/composite_filter.cc',
        'base/composite_filter.h',
        'base/data_buffer.cc',
        'base/data_buffer.h',
        'base/data_source.cc',
        'base/data_source.h',
        'base/decoder_buffer.cc',
        'base/decoder_buffer.h',
        'base/decrypt_config.cc',
        'base/decrypt_config.h',
        'base/decryptor.h',
        'base/decryptor_client.h',
        'base/demuxer.cc',
        'base/demuxer.h',
        'base/demuxer_stream.cc',
        'base/demuxer_stream.h',
        'base/djb2.cc',
        'base/djb2.h',
        'base/filter_collection.cc',
        'base/filter_collection.h',
        'base/filter_host.h',
        'base/filters.cc',
        'base/filters.h',
        'base/h264_bitstream_converter.cc',
        'base/h264_bitstream_converter.h',
        'base/media.h',
        'base/media_android.cc',
        'base/media_export.h',
        'base/media_log.cc',
        'base/media_log.h',
        'base/media_log_event.h',
        'base/media_posix.cc',
        'base/media_switches.cc',
        'base/media_switches.h',
        'base/media_win.cc',
        'base/message_loop_factory.cc',
        'base/message_loop_factory.h',
        'base/pipeline.cc',
        'base/pipeline.h',
        'base/pipeline_status.cc',
        'base/pipeline_status.h',
        'base/ranges.cc',
        'base/ranges.h',
        'base/seekable_buffer.cc',
        'base/seekable_buffer.h',
        'base/state_matrix.cc',
        'base/state_matrix.h',
        'base/stream_parser.cc',
        'base/stream_parser.h',
        'base/stream_parser_buffer.cc',
        'base/stream_parser_buffer.h',
        'base/video_decoder.cc',
        'base/video_decoder.h',
        'base/video_decoder_config.cc',
        'base/video_decoder_config.h',
        'base/video_frame.cc',
        'base/video_frame.h',
        'base/video_renderer.h',
        'base/video_util.cc',
        'base/video_util.h',
        'crypto/aes_decryptor.cc',
        'crypto/aes_decryptor.h',
        'ffmpeg/ffmpeg_common.cc',
        'ffmpeg/ffmpeg_common.h',
        'ffmpeg/file_protocol.cc',
        'ffmpeg/file_protocol.h',
        'filters/audio_file_reader.cc',
        'filters/audio_file_reader.h',
        'filters/audio_renderer_algorithm.cc',
        'filters/audio_renderer_algorithm.h',
        'filters/audio_renderer_impl.cc',
        'filters/audio_renderer_impl.h',
        'filters/bitstream_converter.cc',
        'filters/bitstream_converter.h',
        'filters/chunk_demuxer.cc',
        'filters/chunk_demuxer.h',
        'filters/chunk_demuxer_client.h',
        'filters/dummy_demuxer.cc',
        'filters/dummy_demuxer.h',
        'filters/ffmpeg_audio_decoder.cc',
        'filters/ffmpeg_audio_decoder.h',
        'filters/ffmpeg_demuxer.cc',
        'filters/ffmpeg_demuxer.h',
        'filters/ffmpeg_h264_bitstream_converter.cc',
        'filters/ffmpeg_h264_bitstream_converter.h',
        'filters/ffmpeg_glue.cc',
        'filters/ffmpeg_glue.h',
        'filters/ffmpeg_video_decoder.cc',
        'filters/ffmpeg_video_decoder.h',
        'filters/file_data_source.cc',
        'filters/file_data_source.h',
        'filters/gpu_video_decoder.cc',
        'filters/gpu_video_decoder.h',
        'filters/in_memory_url_protocol.cc',
        'filters/in_memory_url_protocol.h',
        'filters/source_buffer_stream.cc',
        'filters/source_buffer_stream.h',
        'filters/video_frame_generator.cc',
        'filters/video_frame_generator.h',
        'filters/video_renderer_base.cc',
        'filters/video_renderer_base.h',
        'video/capture/fake_video_capture_device.cc',
        'video/capture/fake_video_capture_device.h',
        'video/capture/linux/video_capture_device_linux.cc',
        'video/capture/linux/video_capture_device_linux.h',
        'video/capture/mac/video_capture_device_mac.h',
        'video/capture/mac/video_capture_device_mac.mm',
        'video/capture/mac/video_capture_device_qtkit_mac.h',
        'video/capture/mac/video_capture_device_qtkit_mac.mm',
        'video/capture/video_capture.h',
        'video/capture/video_capture_device.h',
        'video/capture/video_capture_device_dummy.cc',
        'video/capture/video_capture_device_dummy.h',
        'video/capture/video_capture_proxy.cc',
        'video/capture/video_capture_proxy.h',
        'video/capture/video_capture_types.h',
        'video/capture/win/filter_base_win.cc',
        'video/capture/win/filter_base_win.h',
        'video/capture/win/pin_base_win.cc',
        'video/capture/win/pin_base_win.h',
        'video/capture/win/sink_filter_observer_win.h',
        'video/capture/win/sink_filter_win.cc',
        'video/capture/win/sink_filter_win.h',
        'video/capture/win/sink_input_pin_win.cc',
        'video/capture/win/sink_input_pin_win.h',
        'video/capture/win/video_capture_device_win.cc',
        'video/capture/win/video_capture_device_win.h',
        'video/picture.cc',
        'video/picture.h',
        'video/video_decode_accelerator.cc',
        'video/video_decode_accelerator.h',
        'webm/webm_constants.h',
        'webm/webm_cluster_parser.cc',
        'webm/webm_cluster_parser.h',
        'webm/webm_content_encodings.cc',
        'webm/webm_content_encodings.h',
        'webm/webm_content_encodings_client.cc',
        'webm/webm_content_encodings_client.h',
        'webm/webm_info_parser.cc',
        'webm/webm_info_parser.h',
        'webm/webm_parser.cc',
        'webm/webm_parser.h',
        'webm/webm_stream_parser.cc',
        'webm/webm_stream_parser.h',
        'webm/webm_tracks_parser.cc',
        'webm/webm_tracks_parser.h',
      ],
      'direct_dependent_settings': {
        'include_dirs': [
          '..',
        ],
      },
      'conditions': [
        # Android doesn't use ffmpeg, so make the dependency conditional
        # and exclude the sources which depend on ffmpeg.
        ['OS != "android"', {
          'dependencies': [
            '../third_party/ffmpeg/ffmpeg.gyp:ffmpeg',
          ],
        }],
        ['OS == "android"', {
          'sources!': [
            'base/media_posix.cc',
            'ffmpeg/ffmpeg_common.cc',
            'ffmpeg/ffmpeg_common.h',
            'ffmpeg/file_protocol.cc',
            'ffmpeg/file_protocol.h',
            'filters/audio_file_reader.cc',
            'filters/audio_file_reader.h',
            'filters/bitstream_converter.cc',
            'filters/bitstream_converter.h',
            'filters/chunk_demuxer.cc',
            'filters/chunk_demuxer.h',
            'filters/chunk_demuxer_client.h',
            'filters/ffmpeg_audio_decoder.cc',
            'filters/ffmpeg_audio_decoder.h',
            'filters/ffmpeg_demuxer.cc',
            'filters/ffmpeg_demuxer.h',
            'filters/ffmpeg_h264_bitstream_converter.cc',
            'filters/ffmpeg_h264_bitstream_converter.h',
            'filters/ffmpeg_glue.cc',
            'filters/ffmpeg_glue.h',
            'filters/ffmpeg_video_decoder.cc',
            'filters/ffmpeg_video_decoder.h',
            'filters/gpu_video_decoder.cc',
            'filters/gpu_video_decoder.h',
            'webm/webm_cluster_parser.cc',
            'webm/webm_cluster_parser.h',
            'webm/webm_stream_parser.cc',
            'webm/webm_stream_parser.h',
          ],
        }],
        # The below 'android' condition were added temporarily and should be
        # removed in downstream, because there is no Java environment setup in
        # upstream yet.
        ['OS == "android"', {
          'sources!':[
            'audio/android/audio_track_output_android.cc',
          ],
          'sources':[
            'audio/android/audio_track_output_stub_android.cc',
          ],
          'link_settings': {
            'libraries': [
              '-lOpenSLES',
            ],
          },
        }],
        ['OS=="linux" or OS=="freebsd" or OS=="solaris"', {
          'link_settings': {
            'libraries': [
              '-lasound',
            ],
          },
        }],
        ['OS=="openbsd"', {
          'sources/': [ ['exclude', '/alsa_' ],
                        ['exclude', '/audio_manager_linux' ] ],
          'link_settings': {
            'libraries': [
            ],
          },
        }],
        ['OS!="openbsd"', {
          'sources!': [
            'audio/openbsd/audio_manager_openbsd.cc',
            'audio/openbsd/audio_manager_openbsd.h',
          ],
        }],
        ['OS=="linux"', {
          'variables': {
            'conditions': [
              ['sysroot!=""', {
                'pkg-config': '../build/linux/pkg-config-wrapper "<(sysroot)" "<(target_arch)"',
              }, {
                'pkg-config': 'pkg-config'
              }],
            ],
          },
          'conditions': [
            ['use_cras == 1', {
              'cflags': [
                '<!@(<(pkg-config) --cflags libcras)',
              ],
              'link_settings': {
                'libraries': [
                  '<!@(<(pkg-config) --libs libcras)',
                ],
              },
              'defines': [
                'USE_CRAS',
              ],
            }, {  # else: use_cras == 0
              'sources!': [
                'audio/linux/cras_output.cc',
                'audio/linux/cras_output.h',
              ],
            }],
          ],
        }],
        ['os_posix == 1', {
          'conditions': [
            ['use_pulseaudio == 1', {
              'cflags': [
                '<!@(pkg-config --cflags libpulse)',
              ],
              'link_settings': {
                'libraries': [
                  '<!@(pkg-config --libs-only-l libpulse)',
                ],
              },
              'defines': [
                'USE_PULSEAUDIO',
              ],
            }, {  # else: use_pulseaudio == 0
              'sources!': [
                'audio/pulse/pulse_output.cc',
                'audio/pulse/pulse_output.h',
              ],
            }],
          ],
        }],
        ['os_posix == 1 and OS != "android"', {
          # Video capture isn't supported in Android yet.
          'sources!': [
            'video/capture/video_capture_device_dummy.cc',
            'video/capture/video_capture_device_dummy.h',
          ],
        }],
        ['OS=="mac"', {
          'link_settings': {
            'libraries': [
              '$(SDKROOT)/System/Library/Frameworks/AudioUnit.framework',
              '$(SDKROOT)/System/Library/Frameworks/AudioToolbox.framework',
              '$(SDKROOT)/System/Library/Frameworks/CoreAudio.framework',
              '$(SDKROOT)/System/Library/Frameworks/CoreVideo.framework',
              '$(SDKROOT)/System/Library/Frameworks/QTKit.framework',
            ],
          },
        }],
        ['OS=="win"', {
          'sources!': [
            'audio/pulse/pulse_output.cc',
            'audio/pulse/pulse_output.h',
            'video/capture/video_capture_device_dummy.cc',
            'video/capture/video_capture_device_dummy.h',
          ],
        }],
        ['proprietary_codecs==1 or branding=="Chrome"', {
          'sources': [
            'mp4/avc.cc',
            'mp4/avc.h',
            'mp4/box_definitions.cc',
            'mp4/box_definitions.h',
            'mp4/box_reader.cc',
            'mp4/box_reader.h',
            'mp4/cenc.cc',
            'mp4/cenc.h',
            'mp4/mp4_stream_parser.cc',
            'mp4/mp4_stream_parser.h',
            'mp4/offset_byte_queue.cc',
            'mp4/offset_byte_queue.h',
            'mp4/track_run_iterator.cc',
            'mp4/track_run_iterator.h',
          ],
        }],
      ],
    },
    {
      'target_name': 'yuv_convert',
      'type': 'static_library',
      'include_dirs': [
        '..',
      ],
      'conditions': [
        ['order_profiling != 0', {
          'target_conditions' : [
            ['_toolset=="target"', {
              'cflags!': [ '-finstrument-functions' ],
            }],
          ],
        }],
        [ 'target_arch == "ia32" or target_arch == "x64"', {
          'dependencies': [
            'yuv_convert_simd_x86',
          ],
        }],
        [ 'target_arch == "arm"', {
          'dependencies': [
            'yuv_convert_simd_arm',
          ],
        }],
      ],
      'sources': [
        'base/yuv_convert.cc',
        'base/yuv_convert.h',
      ],
    },
    {
      'target_name': 'yuv_convert_simd_x86',
      'type': 'static_library',
      'include_dirs': [
        '..',
      ],
      'sources': [
        'base/simd/convert_rgb_to_yuv_c.cc',
        'base/simd/convert_rgb_to_yuv_sse2.cc',
        'base/simd/convert_rgb_to_yuv_ssse3.asm',
        'base/simd/convert_rgb_to_yuv_ssse3.cc',
        'base/simd/convert_rgb_to_yuv_ssse3.inc',
        'base/simd/convert_yuv_to_rgb_c.cc',
        'base/simd/convert_yuv_to_rgb_x86.cc',
        'base/simd/convert_yuv_to_rgb_mmx.asm',
        'base/simd/convert_yuv_to_rgb_mmx.inc',
        'base/simd/convert_yuv_to_rgb_sse.asm',
        'base/simd/filter_yuv.h',
        'base/simd/filter_yuv_c.cc',
        'base/simd/filter_yuv_mmx.cc',
        'base/simd/filter_yuv_sse2.cc',
        'base/simd/linear_scale_yuv_to_rgb_mmx.asm',
        'base/simd/linear_scale_yuv_to_rgb_mmx.inc',
        'base/simd/linear_scale_yuv_to_rgb_sse.asm',
        'base/simd/scale_yuv_to_rgb_mmx.asm',
        'base/simd/scale_yuv_to_rgb_mmx.inc',
        'base/simd/scale_yuv_to_rgb_sse.asm',
        'base/simd/yuv_to_rgb_table.cc',
        'base/simd/yuv_to_rgb_table.h',
      ],
      'conditions': [
        ['order_profiling != 0', {
          'target_conditions' : [
            ['_toolset=="target"', {
              'cflags!': [ '-finstrument-functions' ],
            }],
          ],
        }],
        [ 'target_arch == "x64"', {
          # Source files optimized for X64 systems.
          'sources': [
            'base/simd/linear_scale_yuv_to_rgb_mmx_x64.asm',
            'base/simd/scale_yuv_to_rgb_sse2_x64.asm',
          ],
        }],
        [ 'os_posix == 1 and OS != "mac" and OS != "android"', {
          'cflags': [
            '-msse2',
          ],
        }],
        [ 'OS == "mac"', {
          'configurations': {
            'Debug': {
              'xcode_settings': {
                # gcc on the mac builds horribly unoptimized sse code in debug
                # mode. Since this is rarely going to be debugged, run with full
                # optimizations in Debug as well as Release.
                'GCC_OPTIMIZATION_LEVEL': '3',  # -O3
               },
             },
          },
        }],
        [ 'OS=="win"', {
          'variables': {
            'yasm_flags': [
              '-DWIN32',
              '-DMSVC',
              '-DCHROMIUM',
              '-Isimd',
            ],
          },
        }],
        [ 'OS=="mac"', {
          'variables': {
            'yasm_flags': [
              '-DPREFIX',
              '-DMACHO',
              '-DCHROMIUM',
              '-Isimd',
            ],
          },
        }],
        [ 'os_posix==1 and OS!="mac"', {
          'variables': {
            'conditions': [
              [ 'target_arch=="ia32"', {
                'yasm_flags': [
                  '-DX86_32',
                  '-DELF',
                  '-DCHROMIUM',
                  '-Isimd',
                ],
              }, {
                'yasm_flags': [
                  '-DARCH_X86_64',
                  '-DELF',
                  '-DPIC',
                  '-DCHROMIUM',
                  '-Isimd',
                ],
              }],
            ],
          },
        }],
      ],
      'variables': {
        'yasm_output_path': '<(SHARED_INTERMEDIATE_DIR)/media',
      },
      'msvs_2010_disable_uldi_when_referenced': 1,
      'includes': [
        '../third_party/yasm/yasm_compile.gypi',
      ],
    },
    {
      'target_name': 'yuv_convert_simd_arm',
      'type': 'static_library',
      'include_dirs': [
        '..',
      ],
      'sources': [
        'base/simd/convert_rgb_to_yuv_c.cc',
        'base/simd/convert_rgb_to_yuv.h',
        'base/simd/convert_yuv_to_rgb_c.cc',
        'base/simd/convert_yuv_to_rgb.h',
        'base/simd/filter_yuv.h',
        'base/simd/filter_yuv_c.cc',
        'base/simd/yuv_to_rgb_table.cc',
        'base/simd/yuv_to_rgb_table.h',
      ],
    },
    {
      'target_name': 'media_unittests',
      'type': 'executable',
      'dependencies': [
        'media',
        'media_test_support',
        'yuv_convert',
        '../base/base.gyp:base',
        '../base/base.gyp:base_i18n',
        '../base/base.gyp:test_support_base',
        '../testing/gmock.gyp:gmock',
        '../testing/gtest.gyp:gtest',
        '../ui/ui.gyp:ui',
      ],
      'sources': [
        'audio/async_socket_io_handler_unittest.cc',
        'audio/audio_input_controller_unittest.cc',
        'audio/audio_input_device_unittest.cc',
        'audio/audio_input_unittest.cc',
        'audio/audio_input_volume_unittest.cc',
        'audio/audio_low_latency_input_output_unittest.cc',
        'audio/audio_output_controller_unittest.cc',
        'audio/audio_output_proxy_unittest.cc',
        'audio/audio_parameters_unittest.cc',
        'audio/audio_util_unittest.cc',
        'audio/cross_process_notification_unittest.cc',
        'audio/linux/alsa_output_unittest.cc',
        'audio/mac/audio_low_latency_input_mac_unittest.cc',
        'audio/mac/audio_output_mac_unittest.cc',
        'audio/simple_sources_unittest.cc',
        'audio/win/audio_low_latency_input_win_unittest.cc',
        'audio/win/audio_low_latency_output_win_unittest.cc',
        'audio/win/audio_output_win_unittest.cc',
        'base/audio_renderer_mixer_unittest.cc',
        'base/audio_renderer_mixer_input_unittest.cc',
        'base/buffers_unittest.cc',
        'base/clock_unittest.cc',
        'base/composite_filter_unittest.cc',
        'base/data_buffer_unittest.cc',
        'base/decoder_buffer_unittest.cc',
        'base/djb2_unittest.cc',
        'base/fake_audio_render_callback.cc',
        'base/fake_audio_render_callback.h',
        'base/filter_collection_unittest.cc',
        'base/h264_bitstream_converter_unittest.cc',
        'base/pipeline_unittest.cc',
        'base/ranges_unittest.cc',
        'base/run_all_unittests.cc',
        'base/seekable_buffer_unittest.cc',
        'base/state_matrix_unittest.cc',
        'base/test_data_util.cc',
        'base/test_data_util.h',
        'base/video_frame_unittest.cc',
        'base/video_util_unittest.cc',
        'base/yuv_convert_unittest.cc',
        'crypto/aes_decryptor_unittest.cc',
        'ffmpeg/ffmpeg_common_unittest.cc',
        'filters/audio_renderer_algorithm_unittest.cc',
        'filters/audio_renderer_impl_unittest.cc',
        'filters/bitstream_converter_unittest.cc',
        'filters/chunk_demuxer_unittest.cc',
        'filters/ffmpeg_audio_decoder_unittest.cc',
        'filters/ffmpeg_decoder_unittest.h',
        'filters/ffmpeg_demuxer_unittest.cc',
        'filters/ffmpeg_glue_unittest.cc',
        'filters/ffmpeg_h264_bitstream_converter_unittest.cc',
        'filters/ffmpeg_video_decoder_unittest.cc',
        'filters/file_data_source_unittest.cc',
        'filters/pipeline_integration_test.cc',
        'filters/pipeline_integration_test_base.cc',
        'filters/source_buffer_stream_unittest.cc',
        'filters/video_renderer_base_unittest.cc',
        'video/capture/video_capture_device_unittest.cc',
        'webm/cluster_builder.cc',
        'webm/cluster_builder.h',
        'webm/webm_cluster_parser_unittest.cc',
        'webm/webm_content_encodings_client_unittest.cc',
        'webm/webm_parser_unittest.cc',
      ],
      'conditions': [
        ['os_posix==1 and OS!="mac"', {
          'conditions': [
            ['linux_use_tcmalloc==1', {
              'dependencies': [
                '../base/allocator/allocator.gyp:allocator',
              ],
            }],
          ],
        }],
        ['OS != "android"', {
          'dependencies': [
            '../third_party/ffmpeg/ffmpeg.gyp:ffmpeg',
          ],
        }],
        ['OS == "android"', {
          'sources!': [
            'audio/audio_input_volume_unittest.cc',
            'base/test_data_util.cc',
            'base/test_data_util.h',
            'ffmpeg/ffmpeg_common_unittest.cc',
            'filters/ffmpeg_audio_decoder_unittest.cc',
            'filters/bitstream_converter_unittest.cc',
            'filters/chunk_demuxer_unittest.cc',
            'filters/ffmpeg_demuxer_unittest.cc',
            'filters/ffmpeg_glue_unittest.cc',
            'filters/ffmpeg_h264_bitstream_converter_unittest.cc',
            'filters/ffmpeg_video_decoder_unittest.cc',
            'filters/pipeline_integration_test.cc',
            'filters/pipeline_integration_test_base.cc',
            'mp4/mp4_stream_parser_unittest.cc',
            'webm/webm_cluster_parser_unittest.cc',
          ],
        }],
        ['OS == "linux"', {
          'conditions': [
            ['use_cras == 1', {
              'sources': [
                'audio/linux/cras_output_unittest.cc',
              ],
              'defines': [
                'USE_CRAS',
              ],
            }],
          ],
        }],
        [ 'target_arch=="ia32" or target_arch=="x64"', {
          'sources': [
            'base/simd/convert_rgb_to_yuv_unittest.cc',
          ],
        }],
        ['proprietary_codecs==1 or branding=="Chrome"', {
          'sources': [
            'mp4/avc_unittest.cc',
            'mp4/box_reader_unittest.cc',
            'mp4/mp4_stream_parser_unittest.cc',
            'mp4/offset_byte_queue_unittest.cc',
          ],
        }],
      ],
    },
    {
      'target_name': 'media_test_support',
      'type': 'static_library',
      'dependencies': [
        'media',
        '../base/base.gyp:base',
        '../testing/gmock.gyp:gmock',
        '../testing/gtest.gyp:gtest',
      ],
      'sources': [
        'audio/test_audio_input_controller_factory.cc',
        'audio/test_audio_input_controller_factory.h',
        'base/mock_callback.cc',
        'base/mock_callback.h',
        'base/mock_data_source_host.cc',
        'base/mock_data_source_host.h',
        'base/mock_demuxer_host.cc',
        'base/mock_demuxer_host.h',
        'base/mock_filter_host.cc',
        'base/mock_filter_host.h',
        'base/mock_filters.cc',
        'base/mock_filters.h',
      ],
    },
    {
      'target_name': 'scaler_bench',
      'type': 'executable',
      'dependencies': [
        'media',
        'yuv_convert',
        '../base/base.gyp:base',
        '../skia/skia.gyp:skia',
      ],
      'sources': [
        'tools/scaler_bench/scaler_bench.cc',
      ],
    },
    {
      'target_name': 'qt_faststart',
      'type': 'executable',
      'sources': [
        'tools/qt_faststart/qt_faststart.c'
      ],
    },
    {
      'target_name': 'seek_tester',
      'type': 'executable',
      'dependencies': [
        'media',
        '../base/base.gyp:base',
      ],
      'sources': [
        'tools/seek_tester/seek_tester.cc',
      ],
    },
  ],
  'conditions': [
    ['OS=="win"', {
      'targets': [
        {
          'target_name': 'player_wtl',
          'type': 'executable',
          'dependencies': [
            'media',
            'yuv_convert',
            '../base/base.gyp:base',
            '../base/third_party/dynamic_annotations/dynamic_annotations.gyp:dynamic_annotations',
            '../ui/ui.gyp:ui',
          ],
          'include_dirs': [
            '<(DEPTH)/third_party/wtl/include',
          ],
          'sources': [
            'tools/player_wtl/list.h',
            'tools/player_wtl/mainfrm.h',
            'tools/player_wtl/movie.cc',
            'tools/player_wtl/movie.h',
            'tools/player_wtl/player_wtl.cc',
            'tools/player_wtl/player_wtl.rc',
            'tools/player_wtl/props.h',
            'tools/player_wtl/seek.h',
            'tools/player_wtl/resource.h',
            'tools/player_wtl/view.h',
          ],
          'msvs_settings': {
            'VCLinkerTool': {
              'SubSystem': '2',         # Set /SUBSYSTEM:WINDOWS
            },
          },
          'defines': [
            '_CRT_SECURE_NO_WARNINGS=1',
          ],
        },
      ],
    }],
    ['OS == "win" or toolkit_uses_gtk == 1', {
      'targets': [
        {
          'target_name': 'shader_bench',
          'type': 'executable',
          'dependencies': [
            'media',
            'yuv_convert',
            '../base/base.gyp:base',
            '../ui/gl/gl.gyp:gl',
          ],
          'sources': [
            'tools/shader_bench/shader_bench.cc',
            'tools/shader_bench/cpu_color_painter.cc',
            'tools/shader_bench/cpu_color_painter.h',
            'tools/shader_bench/gpu_color_painter.cc',
            'tools/shader_bench/gpu_color_painter.h',
            'tools/shader_bench/gpu_painter.cc',
            'tools/shader_bench/gpu_painter.h',
            'tools/shader_bench/painter.cc',
            'tools/shader_bench/painter.h',
            'tools/shader_bench/window.cc',
            'tools/shader_bench/window.h',
          ],
          'conditions': [
            ['toolkit_uses_gtk == 1', {
              'dependencies': [
                '../build/linux/system.gyp:gtk',
              ],
              'sources': [
                'tools/shader_bench/window_linux.cc',
              ],
            }],
            ['OS=="win"', {
              'dependencies': [
                '../third_party/angle/src/build_angle.gyp:libEGL',
                '../third_party/angle/src/build_angle.gyp:libGLESv2',
              ],
              'sources': [
                'tools/shader_bench/window_win.cc',
              ],
            }],
          ],
        },
      ],
    }],
    ['OS == "linux" and target_arch != "arm"', {
      'targets': [
        {
          'target_name': 'tile_render_bench',
          'type': 'executable',
          'dependencies': [
            '../base/base.gyp:base',
            '../ui/gl/gl.gyp:gl',
          ],
          'libraries': [
            '-lGL',
            '-ldl',
          ],
          'sources': [
            'tools/tile_render_bench/tile_render_bench.cc',
          ],
        },
      ],
    }],
    ['os_posix == 1 and OS != "mac" and OS != "android"', {
      'targets': [
        {
          'target_name': 'player_x11',
          'type': 'executable',
          'dependencies': [
            'media',
            'yuv_convert',
            '../base/base.gyp:base',
            '../ui/gl/gl.gyp:gl',
          ],
          'link_settings': {
            'libraries': [
              '-ldl',
              '-lX11',
              '-lXrender',
              '-lXext',
            ],
          },
          'sources': [
            'tools/player_x11/data_source_logger.cc',
            'tools/player_x11/data_source_logger.h',
            'tools/player_x11/gl_video_renderer.cc',
            'tools/player_x11/gl_video_renderer.h',
            'tools/player_x11/player_x11.cc',
            'tools/player_x11/x11_video_renderer.cc',
            'tools/player_x11/x11_video_renderer.h',
          ],
        },
      ],
    }],
    ['OS == "android"', {
      'targets': [
        {
          'target_name': 'player_android',
          'type': 'static_library',
          'sources': [
            'base/android/media_player_bridge.cc',
            'base/android/media_player_bridge.h',
          ],
          'dependencies': [
            '../base/base.gyp:base',
          ],
          'include_dirs': [
            '<(SHARED_INTERMEDIATE_DIR)/media',
          ],
          'actions': [
            {
              'action_name': 'generate-jni-headers',
              'inputs': [
                '../base/android/jni_generator/jni_generator.py',
                'base/android/java/src/org/chromium/media/MediaPlayerListener.java',
              ],
              'outputs': [
                '<(SHARED_INTERMEDIATE_DIR)/media/jni/media_player_listener_jni.h',
              ],
              'action': [
                'python',
                '<(DEPTH)/base/android/jni_generator/jni_generator.py',
                '-o',
                '<@(_inputs)',
                '<@(_outputs)',
              ],
            },
          ],
        },
        {
          'target_name': 'media_java',
          'type': 'none',
          'dependencies': [ '../base/base.gyp:base_java' ],
          'variables': {
            'package_name': 'media',
            'java_in_dir': 'base/android/java',
          },
          'includes': [ '../build/java.gypi' ],
        },

      ],
    }, { # OS != "android"'
      # Android does not use ffmpeg, so disable the targets which require it.
      'targets': [
        {
          'target_name': 'ffmpeg_unittests',
          'type': 'executable',
          'dependencies': [
            'media',
            'media_test_support',
            '../base/base.gyp:base',
            '../base/base.gyp:base_i18n',
            '../base/base.gyp:test_support_base',
            '../base/base.gyp:test_support_perf',
            '../testing/gtest.gyp:gtest',
            '../third_party/ffmpeg/ffmpeg.gyp:ffmpeg',
          ],
          'sources': [
            'ffmpeg/ffmpeg_unittest.cc',
          ],
          'conditions': [
            ['toolkit_uses_gtk == 1', {
              'dependencies': [
                # Needed for the following #include chain:
                #   base/run_all_unittests.cc
                #   ../base/test_suite.h
                #   gtk/gtk.h
                '../build/linux/system.gyp:gtk',
              ],
              'conditions': [
                ['linux_use_tcmalloc==1', {
                  'dependencies': [
                    '../base/allocator/allocator.gyp:allocator',
                  ],
                }],
              ],
            }],
          ],
        },
        {
          'target_name': 'ffmpeg_regression_tests',
          'type': 'executable',
          'dependencies': [
            'media',
            'media_test_support',
            '../base/base.gyp:test_support_base',
            '../testing/gmock.gyp:gmock',
            '../testing/gtest.gyp:gtest',
            '../third_party/ffmpeg/ffmpeg.gyp:ffmpeg',
          ],
          'sources': [
            'base/test_data_util.cc',
            'base/run_all_unittests.cc',
            'ffmpeg/ffmpeg_regression_tests.cc',
            'filters/pipeline_integration_test_base.cc',
          ],
          'conditions': [
            ['os_posix==1 and OS!="mac"', {
              'conditions': [
                ['linux_use_tcmalloc==1', {
                  'dependencies': [
                    '../base/allocator/allocator.gyp:allocator',
                  ],
                }],
              ],
            }],
          ],
        },
        {
          'target_name': 'ffmpeg_tests',
          'type': 'executable',
          'dependencies': [
            'media',
            '../base/base.gyp:base',
            '../third_party/ffmpeg/ffmpeg.gyp:ffmpeg',
          ],
          'sources': [
            'test/ffmpeg_tests/ffmpeg_tests.cc',
          ],
        },
        {
          'target_name': 'media_bench',
          'type': 'executable',
          'dependencies': [
            'media',
            '../base/base.gyp:base',
            '../third_party/ffmpeg/ffmpeg.gyp:ffmpeg',
          ],
          'sources': [
            'tools/media_bench/media_bench.cc',
          ],
        },
      ],
    }]
  ],
}
