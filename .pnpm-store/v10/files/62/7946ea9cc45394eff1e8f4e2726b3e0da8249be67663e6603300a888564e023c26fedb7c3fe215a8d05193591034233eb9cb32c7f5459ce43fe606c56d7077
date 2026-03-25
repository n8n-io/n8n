/*
Language: CMake
Description: CMake is an open-source cross-platform system for build automation.
Author: Igor Kalnitsky <igor@kalnitsky.org>
Website: https://cmake.org
Category: build-system
*/

/** @type LanguageFn */
function cmake(hljs) {
  return {
    name: 'CMake',
    aliases: [ 'cmake.in' ],
    case_insensitive: true,
    keywords: { keyword:
        // scripting commands
        'break cmake_host_system_information cmake_minimum_required cmake_parse_arguments '
        + 'cmake_policy configure_file continue elseif else endforeach endfunction endif endmacro '
        + 'endwhile execute_process file find_file find_library find_package find_path '
        + 'find_program foreach function get_cmake_property get_directory_property '
        + 'get_filename_component get_property if include include_guard list macro '
        + 'mark_as_advanced math message option return separate_arguments '
        + 'set_directory_properties set_property set site_name string unset variable_watch while '
        // project commands
        + 'add_compile_definitions add_compile_options add_custom_command add_custom_target '
        + 'add_definitions add_dependencies add_executable add_library add_link_options '
        + 'add_subdirectory add_test aux_source_directory build_command create_test_sourcelist '
        + 'define_property enable_language enable_testing export fltk_wrap_ui '
        + 'get_source_file_property get_target_property get_test_property include_directories '
        + 'include_external_msproject include_regular_expression install link_directories '
        + 'link_libraries load_cache project qt_wrap_cpp qt_wrap_ui remove_definitions '
        + 'set_source_files_properties set_target_properties set_tests_properties source_group '
        + 'target_compile_definitions target_compile_features target_compile_options '
        + 'target_include_directories target_link_directories target_link_libraries '
        + 'target_link_options target_sources try_compile try_run '
        // CTest commands
        + 'ctest_build ctest_configure ctest_coverage ctest_empty_binary_directory ctest_memcheck '
        + 'ctest_read_custom_files ctest_run_script ctest_sleep ctest_start ctest_submit '
        + 'ctest_test ctest_update ctest_upload '
        // deprecated commands
        + 'build_name exec_program export_library_dependencies install_files install_programs '
        + 'install_targets load_command make_directory output_required_files remove '
        + 'subdir_depends subdirs use_mangled_mesa utility_source variable_requires write_file '
        + 'qt5_use_modules qt5_use_package qt5_wrap_cpp '
        // core keywords
        + 'on off true false and or not command policy target test exists is_newer_than '
        + 'is_directory is_symlink is_absolute matches less greater equal less_equal '
        + 'greater_equal strless strgreater strequal strless_equal strgreater_equal version_less '
        + 'version_greater version_equal version_less_equal version_greater_equal in_list defined' },
    contains: [
      {
        className: 'variable',
        begin: /\$\{/,
        end: /\}/
      },
      hljs.COMMENT(/#\[\[/, /]]/),
      hljs.HASH_COMMENT_MODE,
      hljs.QUOTE_STRING_MODE,
      hljs.NUMBER_MODE
    ]
  };
}

export { cmake as default };
