cmake_minimum_required(VERSION 3.15)
project(Sample VERSION 1.0.0 LANGUAGES CXX)

include(CTest)
find_package(CpuFeatures REQUIRED)

add_executable(sample main.cpp)
target_compile_features(sample PUBLIC cxx_std_11)
set_target_properties(sample PROPERTIES
  CXX_STANDARD 11
  CXX_STANDARD_REQUIRED ON
  VERSION ${PROJECT_VERSION})
target_link_libraries(sample PRIVATE CpuFeatures::cpu_features)

if(BUILD_TESTING)
  add_test(NAME sample_test COMMAND sample)
endif()

include(GNUInstallDirs)
install(TARGETS sample
  EXPORT SampleTargets
  DESTINATION ${CMAKE_INSTALL_BIN_DIR})
