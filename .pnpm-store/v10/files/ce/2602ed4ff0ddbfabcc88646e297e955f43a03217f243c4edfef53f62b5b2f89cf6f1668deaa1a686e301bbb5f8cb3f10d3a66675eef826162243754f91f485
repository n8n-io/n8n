
#
# library : NDK compat
#
find_package(Threads REQUIRED)
set (NDK_COMPAT_HDRS cpu-features.h)
set (NDK_COMPAT_SRCS
  cpu-features.c
  $<TARGET_OBJECTS:utils>
  $<TARGET_OBJECTS:unix_based_hardware_detection>
)
# Note that following `add_cpu_features_headers_and_sources` will use
# NDK_COMPAT_SRCS in lieu of NDK_COMPAT_HDRS because we don't want cpu_features
# headers to be installed alongside ndk_compat.
add_cpu_features_headers_and_sources(NDK_COMPAT_SRCS NDK_COMPAT_SRCS)
add_library(ndk_compat ${NDK_COMPAT_HDRS} ${NDK_COMPAT_SRCS})
setup_include_and_definitions(ndk_compat)
target_include_directories(ndk_compat PUBLIC $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>)
target_link_libraries(ndk_compat PUBLIC ${CMAKE_DL_LIBS} ${CMAKE_THREAD_LIBS_INIT})
set_target_properties(ndk_compat PROPERTIES PUBLIC_HEADER "${NDK_COMPAT_HDRS}")

include(GNUInstallDirs)
install(TARGETS ndk_compat
  EXPORT CpuFeaturesNdkCompatTargets
  PUBLIC_HEADER DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}/ndk_compat
  ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
  LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
  RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
)
install(EXPORT CpuFeaturesNdkCompatTargets
  NAMESPACE CpuFeatures::
  DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/CpuFeaturesNdkCompat
  COMPONENT Devel
)
include(CMakePackageConfigHelpers)
configure_package_config_file(${PROJECT_SOURCE_DIR}/cmake/CpuFeaturesNdkCompatConfig.cmake.in
  "${PROJECT_BINARY_DIR}/CpuFeaturesNdkCompatConfig.cmake"
  INSTALL_DESTINATION "${CMAKE_INSTALL_LIBDIR}/cmake/CpuFeaturesNdkCompat"
  NO_SET_AND_CHECK_MACRO
  NO_CHECK_REQUIRED_COMPONENTS_MACRO
)
write_basic_package_version_file(
  "${PROJECT_BINARY_DIR}/CpuFeaturesNdkCompatConfigVersion.cmake"
  COMPATIBILITY SameMajorVersion
)
install(
  FILES
    "${PROJECT_BINARY_DIR}/CpuFeaturesNdkCompatConfig.cmake"
    "${PROJECT_BINARY_DIR}/CpuFeaturesNdkCompatConfigVersion.cmake"
  DESTINATION "${CMAKE_INSTALL_LIBDIR}/cmake/CpuFeaturesNdkCompat"
  COMPONENT Devel
)

#
# program : NDK compat test program
#
if(BUILD_TESTING)
  add_executable(ndk-compat-test ndk-compat-test.c)
  target_link_libraries(ndk-compat-test PRIVATE ndk_compat)
endif()
