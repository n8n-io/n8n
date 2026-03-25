#!/usr/bin/env bash
set -eo pipefail

function extract() {
  echo "Extracting ${1}..."
  case $1 in
    *.tar.bz2)   tar xjf "$1"    ;;
    *.tar.xz)    tar xJf "$1"    ;;
    *.tar.gz)    tar xzf "$1"    ;;
    *)
      >&2 echo "don't know how to extract '$1'..."
      exit 1
  esac
}

function unpack() {
  mkdir -p "${ARCHIVE_DIR}"
  cd "${ARCHIVE_DIR}" || exit 2
  local -r URL=$1
  local -r RELATIVE_DIR=$2
  local -r DESTINATION="${ARCHIVE_DIR}/${RELATIVE_DIR}"
  if [[  ! -d "${DESTINATION}" ]] ; then
    echo "Downloading ${URL}..."
    local -r ARCHIVE_NAME=$(basename "${URL}")
    [[ -f "${ARCHIVE_NAME}" ]] || wget --no-verbose "${URL}"
    extract "${ARCHIVE_NAME}"
    rm -f "${ARCHIVE_NAME}"
  fi
}

function install_qemu() {
  if [[ "${QEMU_ARCH}" == "DISABLED" ]]; then
    >&2 echo 'QEMU is disabled !'
    return 0
  fi
  local -r QEMU_VERSION=${QEMU_VERSION:=7.1.0}
  local -r QEMU_TARGET=${QEMU_ARCH}-linux-user

  if echo "${QEMU_VERSION} ${QEMU_TARGET}" | cmp --silent "${QEMU_INSTALL}/.build" -; then
    echo "qemu ${QEMU_VERSION} up to date!"
    return 0
  fi

  echo "QEMU_VERSION: ${QEMU_VERSION}"
  echo "QEMU_TARGET: ${QEMU_TARGET}"

  rm -rf "${QEMU_INSTALL}"

  # Checking for a tarball before downloading makes testing easier :-)
  local -r QEMU_URL="http://wiki.qemu-project.org/download/qemu-${QEMU_VERSION}.tar.xz"
  local -r QEMU_DIR="qemu-${QEMU_VERSION}"
  unpack ${QEMU_URL} ${QEMU_DIR}
  cd ${QEMU_DIR} || exit 2

  # Qemu (meson based build) depends on: pkgconf, libglib2.0, python3, ninja
  ./configure \
    --prefix="${QEMU_INSTALL}" \
    --target-list="${QEMU_TARGET}" \
    --audio-drv-list= \
    --disable-brlapi \
    --disable-curl \
    --disable-curses \
    --disable-docs \
    --disable-gcrypt \
    --disable-gnutls \
    --disable-gtk \
    --disable-libnfs \
    --disable-libssh \
    --disable-nettle \
    --disable-opengl \
    --disable-sdl \
    --disable-virglrenderer \
    --disable-vte

  # wrapper on ninja
  make -j8
  make install

  echo "$QEMU_VERSION $QEMU_TARGET" > "${QEMU_INSTALL}/.build"
}

function assert_defined(){
  if [[ -z "${!1}" ]]; then
    >&2 echo "Variable '${1}' must be defined"
    exit 1
  fi
}

function clean_build() {
  # Cleanup previous build
  rm -rf "${BUILD_DIR}"
  mkdir -p "${BUILD_DIR}"
}

function expand_linaro_config() {
  #ref: https://releases.linaro.org/components/toolchain/binaries/
  local -r LINARO_VERSION=7.5-2019.12
  local -r LINARO_ROOT_URL=https://releases.linaro.org/components/toolchain/binaries/${LINARO_VERSION}

  local -r GCC_VERSION=7.5.0-2019.12
  local -r GCC_URL=${LINARO_ROOT_URL}/${TARGET}/gcc-linaro-${GCC_VERSION}-x86_64_${TARGET}.tar.xz
  local -r GCC_RELATIVE_DIR="gcc-linaro-${GCC_VERSION}-x86_64_${TARGET}"
  unpack "${GCC_URL}" "${GCC_RELATIVE_DIR}"

  local -r SYSROOT_VERSION=2.25-2019.12
  local -r SYSROOT_URL=${LINARO_ROOT_URL}/${TARGET}/sysroot-glibc-linaro-${SYSROOT_VERSION}-${TARGET}.tar.xz
  local -r SYSROOT_RELATIVE_DIR=sysroot-glibc-linaro-${SYSROOT_VERSION}-${TARGET}
  unpack "${SYSROOT_URL}" "${SYSROOT_RELATIVE_DIR}"

  local -r SYSROOT_DIR=${ARCHIVE_DIR}/${SYSROOT_RELATIVE_DIR}
  local -r STAGING_DIR=${ARCHIVE_DIR}/${SYSROOT_RELATIVE_DIR}-stage
  local -r GCC_DIR=${ARCHIVE_DIR}/${GCC_RELATIVE_DIR}

  # Write a Toolchain file
  # note: This is manadatory to use a file in order to have the CMake variable
  # 'CMAKE_CROSSCOMPILING' set to TRUE.
  # ref: https://cmake.org/cmake/help/latest/manual/cmake-toolchains.7.html#cross-compiling-for-linux
  cat >"$TOOLCHAIN_FILE" <<EOL
set(CMAKE_SYSTEM_NAME Linux)
set(CMAKE_SYSTEM_PROCESSOR ${TARGET})

set(CMAKE_SYSROOT ${SYSROOT_DIR})
set(CMAKE_STAGING_PREFIX ${STAGING_DIR})

set(tools ${GCC_DIR})
set(CMAKE_C_COMPILER \${tools}/bin/${TARGET}-gcc)
set(CMAKE_CXX_COMPILER \${tools}/bin/${TARGET}-g++)

set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_PACKAGE ONLY)
EOL
CMAKE_ADDITIONAL_ARGS+=( -DCMAKE_TOOLCHAIN_FILE="${TOOLCHAIN_FILE}" )
QEMU_ARGS+=( -L "${SYSROOT_DIR}" )
QEMU_ARGS+=( -E LD_LIBRARY_PATH=/lib )
}

function expand_bootlin_config() {
  # ref: https://toolchains.bootlin.com/
  local -r GCC_DIR=${ARCHIVE_DIR}/${GCC_RELATIVE_DIR}

  case "${TARGET}" in
    "aarch64")
      local -r TOOLCHAIN_URL="https://toolchains.bootlin.com/downloads/releases/toolchains/aarch64/tarballs/aarch64--glibc--stable-2021.11-1.tar.bz2"
      local -r GCC_PREFIX="aarch64"
      ;;
    "aarch64be")
      local -r TOOLCHAIN_URL="https://toolchains.bootlin.com/downloads/releases/toolchains/aarch64be/tarballs/aarch64be--glibc--stable-2021.11-1.tar.bz2"
      local -r GCC_PREFIX="aarch64_be"
      ;;
    "ppc64le")
      local -r TOOLCHAIN_URL="https://toolchains.bootlin.com/downloads/releases/toolchains/powerpc64le-power8/tarballs/powerpc64le-power8--glibc--stable-2021.11-1.tar.bz2"
      local -r GCC_PREFIX="powerpc64le"
      ;;
    "ppc64")
      local -r TOOLCHAIN_URL="https://toolchains.bootlin.com/downloads/releases/toolchains/powerpc64-power8/tarballs/powerpc64-power8--glibc--stable-2021.11-1.tar.bz2"
      local -r GCC_PREFIX="powerpc64"
      ;;
    "ppc")
      #local -r TOOLCHAIN_URL="https://toolchains.bootlin.com/downloads/releases/toolchains/powerpc-e500mc/tarballs/powerpc-e500mc--glibc--stable-2021.11-1.tar.bz2"
      local -r TOOLCHAIN_URL="https://toolchains.bootlin.com/downloads/releases/toolchains/powerpc-440fp/tarballs/powerpc-440fp--glibc--stable-2021.11-1.tar.bz2"
      local -r GCC_PREFIX="powerpc"
      ;;
    "riscv32")
      local -r TOOLCHAIN_URL="https://toolchains.bootlin.com/downloads/releases/toolchains/riscv32-ilp32d/tarballs/riscv32-ilp32d--glibc--bleeding-edge-2022.08-1.tar.bz2"
      local -r GCC_PREFIX="riscv32"
      ;;
    "riscv64")
      local -r TOOLCHAIN_URL="https://toolchains.bootlin.com/downloads/releases/toolchains/riscv64-lp64d/tarballs/riscv64-lp64d--glibc--stable-2022.08-1.tar.bz2"
      local -r GCC_PREFIX="riscv64"
      ;;
    "s390x")
      local -r TOOLCHAIN_URL="https://toolchains.bootlin.com/downloads/releases/toolchains/s390x-z13/tarballs/s390x-z13--glibc--stable-2022.08-1.tar.bz2"
      local -r GCC_PREFIX="s390x"
      ;;
    *)
      >&2 echo 'unknown power platform'
      exit 1 ;;
  esac

  local -r TOOLCHAIN_RELATIVE_DIR="${TARGET}"
  unpack "${TOOLCHAIN_URL}" "${TOOLCHAIN_RELATIVE_DIR}"
  local -r EXTRACT_DIR="${ARCHIVE_DIR}/$(basename ${TOOLCHAIN_URL%.tar.bz2})"

  local -r TOOLCHAIN_DIR=${ARCHIVE_DIR}/${TOOLCHAIN_RELATIVE_DIR}
  if [[ -d "${EXTRACT_DIR}" ]]; then
    mv "${EXTRACT_DIR}" "${TOOLCHAIN_DIR}"
  fi

  local -r SYSROOT_DIR="${TOOLCHAIN_DIR}/${GCC_PREFIX}-buildroot-linux-gnu/sysroot"
  #local -r STAGING_DIR=${SYSROOT_DIR}-stage

  # Write a Toolchain file
  # note: This is manadatory to use a file in order to have the CMake variable
  # 'CMAKE_CROSSCOMPILING' set to TRUE.
  # ref: https://cmake.org/cmake/help/latest/manual/cmake-toolchains.7.html#cross-compiling-for-linux
  cat >"${TOOLCHAIN_FILE}" <<EOL
set(CMAKE_SYSTEM_NAME Linux)
set(CMAKE_SYSTEM_PROCESSOR ${GCC_PREFIX})

set(CMAKE_SYSROOT ${SYSROOT_DIR})
#set(CMAKE_STAGING_PREFIX ${STAGING_DIR})

set(tools ${TOOLCHAIN_DIR})

set(CMAKE_C_COMPILER \${tools}/bin/${GCC_PREFIX}-linux-gcc)
set(CMAKE_C_FLAGS "${POWER_FLAGS}")
set(CMAKE_CXX_COMPILER \${tools}/bin/${GCC_PREFIX}-linux-g++)
set(CMAKE_CXX_FLAGS "${POWER_FLAGS} -L${SYSROOT_DIR}/lib")

set(CMAKE_FIND_ROOT_PATH ${TOOLCHAIN_DIR})
set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_PACKAGE ONLY)
EOL

CMAKE_ADDITIONAL_ARGS+=( -DCMAKE_TOOLCHAIN_FILE="${TOOLCHAIN_FILE}" )
QEMU_ARGS+=( -L "${SYSROOT_DIR}" )
QEMU_ARGS+=( -E LD_PRELOAD="${SYSROOT_DIR}/usr/lib/libstdc++.so.6:${SYSROOT_DIR}/lib/libgcc_s.so.1" )
}

function expand_codescape_config() {
  # https://www.mips.com/develop/tools/codescape-mips-sdk/mips-toolchain-configurations/
  # mips-mti: MIPS32R6 and MIPS64R6
  # mips-img: MIPS32R2 and MIPS64R2

  # ref: https://codescape.mips.com/components/toolchain/2020.06-01/downloads.html
  local -r DATE=2020.06-01
  local -r CODESCAPE_URL=https://codescape.mips.com/components/toolchain/${DATE}/Codescape.GNU.Tools.Package.${DATE}.for.MIPS.MTI.Linux.CentOS-6.x86_64.tar.gz
  local -r GCC_RELATIVE_DIR="mips-mti-linux-gnu/${DATE}"

  # ref: https://codescape.mips.com/components/toolchain/2019.02-04/downloads.html
  #local -r DATE=2019.02-04
  #local -r CODESCAPE_URL=https://codescape.mips.com/components/toolchain/${DATE}/Codescape.GNU.Tools.Package.${DATE}.for.MIPS.IMG.Linux.CentOS-6.x86_64.tar.gz
  #local -r GCC_RELATIVE_DIR="mips-img-linux-gnu/${DATE}"

  local -r GCC_URL=${CODESCAPE_URL}
  unpack "${GCC_URL}" "${GCC_RELATIVE_DIR}"

  local -r GCC_DIR=${ARCHIVE_DIR}/${GCC_RELATIVE_DIR}
  local MIPS_FLAGS=""
  local LIBC_DIR_SUFFIX=""
  local FLAVOUR=""
  case "${TARGET}" in
    "mips32")
      MIPS_FLAGS="-EB -mips32r6 -mabi=32"
      FLAVOUR="mips-r6-hard"
      #MIPS_FLAGS="-EB -mips32r2 -mabi=32"
      #FLAVOUR="mips-r2-hard"
      LIBC_DIR_SUFFIX="lib"
      ;;
    "mips32el")
      MIPS_FLAGS="-EL -mips32r6 -mabi=32"
      FLAVOUR="mipsel-r6-hard"
      #MIPS_FLAGS="-EL -mips32r2 -mabi=32"
      #FLAVOUR="mipsel-r2-hard"
      LIBC_DIR_SUFFIX="lib"
      ;;
    "mips64")
      MIPS_FLAGS="-EB -mips64r6 -mabi=64"
      FLAVOUR="mips-r6-hard"
      #MIPS_FLAGS="-EB -mips64r2 -mabi=64"
      #FLAVOUR="mips-r2-hard"
      LIBC_DIR_SUFFIX="lib64"
      ;;
    "mips64el")
      MIPS_FLAGS="-EL -mips64r6 -mabi=64"
      FLAVOUR="mipsel-r6-hard"
      #MIPS_FLAGS="-EL -mips64r2 -mabi=64"
      #FLAVOUR="mipsel-r2-hard"
      LIBC_DIR_SUFFIX="lib64"
      ;;
    *)
      >&2 echo 'unknown mips platform'
      exit 1 ;;
  esac
  local -r SYSROOT_DIR=${GCC_DIR}/sysroot
  local -r STAGING_DIR=${SYSROOT_DIR}-stage

  # Write a Toolchain file
  # note: This is manadatory to use a file in order to have the CMake variable
  # 'CMAKE_CROSSCOMPILING' set to TRUE.
  # ref: https://cmake.org/cmake/help/latest/manual/cmake-toolchains.7.html#cross-compiling-for-linux
  cat >"${TOOLCHAIN_FILE}" <<EOL
set(CMAKE_SYSTEM_NAME Linux)
set(CMAKE_SYSTEM_PROCESSOR ${TARGET})

set(CMAKE_SYSROOT ${SYSROOT_DIR})
set(CMAKE_STAGING_PREFIX ${STAGING_DIR})

set(tools ${GCC_DIR})

# R6
set(CMAKE_C_COMPILER \${tools}/bin/mips-mti-linux-gnu-gcc)
set(CMAKE_C_FLAGS "${MIPS_FLAGS}")
set(CMAKE_CXX_COMPILER \${tools}/bin/mips-mti-linux-gnu-g++)
set(CMAKE_CXX_FLAGS "${MIPS_FLAGS} -L${SYSROOT_DIR}/usr/lib64")

# R2
#set(CMAKE_C_COMPILER \${tools}/bin/mips-img-linux-gnu-gcc)
#set(CMAKE_C_FLAGS "${MIPS_FLAGS}")
#set(CMAKE_CXX_COMPILER \${tools}/bin/mips-img-linux-gnu-g++)
#set(CMAKE_CXX_FLAGS "${MIPS_FLAGS}")

set(CMAKE_FIND_ROOT_PATH ${GCC_DIR})
set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_PACKAGE ONLY)
EOL

CMAKE_ADDITIONAL_ARGS+=( -DCMAKE_TOOLCHAIN_FILE="${TOOLCHAIN_FILE}" )
QEMU_ARGS+=( -L "${SYSROOT_DIR}/${FLAVOUR}" )
local -r LIBC_DIR=${GCC_DIR}/mips-mti-linux-gnu/lib/${FLAVOUR}/${LIBC_DIR_SUFFIX}
#local -r LIBC_DIR=${GCC_DIR}/mips-img-linux-gnu/lib/${FLAVOUR}/${LIBC_DIR_SUFFIX}
QEMU_ARGS+=( -E LD_PRELOAD="${LIBC_DIR}/libstdc++.so.6:${LIBC_DIR}/libgcc_s.so.1" )
}

function build() {
  cd "${PROJECT_DIR}" || exit 2
  set -x
  clean_build
  cmake -S. -B"${BUILD_DIR}" "${CMAKE_DEFAULT_ARGS[@]}" "${CMAKE_ADDITIONAL_ARGS[@]}"
  cmake --build "${BUILD_DIR}" --target all -j8 -v
  set +x
}

function run_test() {
  assert_defined QEMU_ARCH
  if [[ "${QEMU_ARCH}" == "DISABLED" ]]; then
    >&2 echo "QEMU is disabled for ${TARGET}"
    return
  fi
  install_qemu
  RUN_CMD="${QEMU_INSTALL}/bin/qemu-${QEMU_ARCH} ${QEMU_ARGS[*]}"

  cd "${BUILD_DIR}" || exit 2
  declare -a TEST_BINARIES=()
  TEST_BINARIES+=($(find "${BUILD_DIR}"/test -executable -type f))
  TEST_BINARIES+=($(find "${BUILD_DIR}" -maxdepth 1 -executable -type f))
  set -x
  set -e
  for test_binary in ${TEST_BINARIES[*]} ; do
      ${RUN_CMD} "${test_binary}"
  done
  set +e
  set +x
}

function usage() {
  local -r NAME=$(basename "$0")
  echo -e "$NAME - Build using a cross toolchain.

SYNOPSIS
\t$NAME [-h|--help] [toolchain|build|qemu|test|all]

DESCRIPTION
\tCross compile using a cross toolchain.

\tYou MUST define the following variables before running this script:
\t* TARGET:
\t\tx86_64
\t\taarch64 aarch64be (bootlin)
\t\taarch64-linux-gnu aarch64_be-linux-gnu (linaro)
\t\tarm-linux-gnueabihf armv8l-linux-gnueabihf arm-linux-gnueabi (linaro)
\t\tarmeb-linux-gnueabihf armeb-linux-gnueabi (linaro)
\t\tmips32 mips32el (codespace)
\t\tmips64 mips64el (codespace)
\t\tppc (bootlin)
\t\tppc64 ppc64le (bootlin)
\t\triscv32 riscv64 (bootlin)
\t\ts390x (bootlin)

OPTIONS
\t-h --help: show this help text
\ttoolchain: download, unpack toolchain and generate CMake toolchain file
\tbuild: toolchain + build the project using the toolchain file (note: remove previous build dir)
\tqemu: download, unpack and build qemu
\ttest: qemu + run all executable using qemu (note: don't build !)
\tall: build + test (default)

EXAMPLES
* Using export:
export TARGET=aarch64-linux-gnu
$0

* One-liner:
TARGET=aarch64-linux-gnu $0"
}

# Main
function main() {
  case ${1} in
    -h | --help)
      usage; exit ;;
  esac

  assert_defined TARGET

  declare -r PROJECT_DIR="$(cd -P -- "$(dirname -- "$0")/.." && pwd -P)"
  declare -r ARCHIVE_DIR="${PROJECT_DIR}/build_cross/archives"
  declare -r BUILD_DIR="${PROJECT_DIR}/build_cross/${TARGET}"
  declare -r TOOLCHAIN_FILE=${ARCHIVE_DIR}/toolchain_${TARGET}.cmake

  echo "Target: '${TARGET}'"

  echo "Project dir: '${PROJECT_DIR}'"
  echo "Archive dir: '${ARCHIVE_DIR}'"
  echo "Build dir: '${BUILD_DIR}'"
  echo "toolchain file: '${TOOLCHAIN_FILE}'"

  declare -a CMAKE_DEFAULT_ARGS=( -G ${CMAKE_GENERATOR:-"Ninja"} )
  declare -a CMAKE_ADDITIONAL_ARGS=()

  declare -a QEMU_ARGS=()
  case ${TARGET} in
    x86_64)
      declare -r QEMU_ARCH=x86_64 ;;
    arm-linux-gnueabihf | armv8l-linux-gnueabihf | arm-linux-gnueabi)
      expand_linaro_config
      declare -r QEMU_ARCH=arm ;;
    armeb-linux-gnueabihf | armeb-linux-gnueabi)
      expand_linaro_config
      declare -r QEMU_ARCH=DISABLED ;;
    aarch64-linux-gnu)
      expand_linaro_config
      declare -r QEMU_ARCH=aarch64 ;;
    aarch64_be-linux-gnu)
      expand_linaro_config
      declare -r QEMU_ARCH=aarch64_be ;;
    aarch64)
      expand_bootlin_config
      declare -r QEMU_ARCH=aarch64 ;;
    aarch64be)
      expand_bootlin_config
      declare -r QEMU_ARCH=aarch64_be ;;
    mips32)
      expand_codescape_config
      declare -r QEMU_ARCH=mips ;;
    mips32el)
      expand_codescape_config
      declare -r QEMU_ARCH=mipsel ;;
    mips64)
      expand_codescape_config
      declare -r QEMU_ARCH=mips64 ;;
    mips64el)
      expand_codescape_config
      declare -r QEMU_ARCH=mips64el ;;
    ppc64le)
      expand_bootlin_config
      declare -r QEMU_ARCH=ppc64le ;;
    ppc64)
      expand_bootlin_config
      declare -r QEMU_ARCH=ppc64 ;;
    ppc)
      expand_bootlin_config
      declare -r QEMU_ARCH=ppc ;;
    riscv32)
      expand_bootlin_config
      declare -r QEMU_ARCH=riscv32 ;;
    riscv64)
      expand_bootlin_config
      declare -r QEMU_ARCH=riscv64 ;;
    s390x)
      expand_bootlin_config
      declare -r QEMU_ARCH=s390x ;;
    *)
      >&2 echo "Unknown TARGET '${TARGET}'..."
      exit 1 ;;
  esac
  declare -r QEMU_INSTALL=${ARCHIVE_DIR}/qemu-${QEMU_ARCH}

  case ${1} in
    toolchain)
      exit ;;
    build)
      build ;;
    qemu)
      install_qemu ;;
    test)
      run_test ;;
    *)
      build
      run_test ;;
  esac
}

main "${1:-all}"
