cmake_minimum_required(VERSION 3.20)
project(pcre2_wrapper CXX)

if(NOT EMSCRIPTEN)
  message(FATAL_ERROR
    "This project only builds under Emscripten. Configure with 'emcmake cmake ...' "
    "(see scripts/build-wasm.sh).")
endif()

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release CACHE STRING "" FORCE)
endif()

# Link-time optimization across the PCRE2 static lib and our wrapper TUs.
set(CMAKE_INTERPROCEDURAL_OPTIMIZATION ON)

# PCRE2 is vendored as a git submodule at vendor/pcre2, pinned to an exact
# commit (checked out at tag pcre2-10.45). Unlike a tag name, a submodule
# pointer is a commit SHA baked into this repo's git history: it cannot
# silently move if the upstream tag is ever re-pointed.
if(NOT EXISTS "${CMAKE_SOURCE_DIR}/vendor/pcre2/CMakeLists.txt")
  message(FATAL_ERROR
    "vendor/pcre2 is empty. Run 'git submodule update --init --recursive'.")
endif()

# Build PCRE2 as a static library baked into the single wasm module: no
# shared libs, no JIT (match_limit/depth_limit/heap_limit only apply to the
# interpreted matcher), Unicode on (needed for PCRE2_UTF), and no extra
# binaries/tests we don't use. 16-bit: its offsets line up with JS's UTF-16 strings.
set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
set(PCRE2_STATIC_PIC ON CACHE BOOL "" FORCE)
set(PCRE2_SUPPORT_JIT OFF CACHE BOOL "" FORCE)
set(PCRE2_SUPPORT_UNICODE ON CACHE BOOL "" FORCE)
set(PCRE2_BUILD_PCRE2GREP OFF CACHE BOOL "" FORCE)
set(PCRE2_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(PCRE2_BUILD_PCRE2_8 OFF CACHE BOOL "" FORCE)
set(PCRE2_BUILD_PCRE2_16 ON CACHE BOOL "" FORCE)
set(PCRE2_BUILD_PCRE2_32 OFF CACHE BOOL "" FORCE)

add_subdirectory(vendor/pcre2 pcre2-build)

add_executable(pcre2_wrapper
  native/pcre2_wrapper.cpp
  native/pcre2_wrapper_bindings.cpp
)

target_link_libraries(pcre2_wrapper PRIVATE pcre2-16)
target_include_directories(pcre2_wrapper PRIVATE
  ${CMAKE_SOURCE_DIR}/vendor/pcre2/src
  ${CMAKE_BINARY_DIR}/pcre2-build
)

# Neither our wrapper nor PCRE2 (a plain-C library, no JIT) throws/catches C++
# exceptions or uses setjmp/longjmp, so drop the unwind-table codegen for both.
target_compile_options(pcre2_wrapper PRIVATE "-fno-exceptions")

# --bind: Embind, for the C++ <-> JS bridge used in native/pcre2_wrapper.cpp.
# MODULARIZE + EXPORT_ES6: emit an ES module factory so this can be
# `import`-ed directly from src/pcre2-engine.ts.
# ALLOW_MEMORY_GROWTH: match subjects are arbitrary-length workflow data,
# not a fixed size known at compile time.
# MALLOC=emmalloc: smaller allocator; fine given short-lived, growth-backed allocations.
# FILESYSTEM=0: nothing here does fopen/emulated-FS access; only raw wasm-binary loading.
target_link_options(pcre2_wrapper PRIVATE
  "--bind"
  "-O3"
  "--closure=1"
  "-g0"
  "-sMODULARIZE=1"
  "-sEXPORT_ES6=1"
  "-sEXPORT_NAME=createPcre2WrapperModule"
  "-sALLOW_MEMORY_GROWTH=1"
  "-sENVIRONMENT=node"
  "-sMALLOC=emmalloc"
  "-sFILESYSTEM=0"
  "-sDISABLE_EXCEPTION_CATCHING=1"
  "-sSUPPORT_LONGJMP=0"
)

set_target_properties(pcre2_wrapper PROPERTIES SUFFIX ".js")
