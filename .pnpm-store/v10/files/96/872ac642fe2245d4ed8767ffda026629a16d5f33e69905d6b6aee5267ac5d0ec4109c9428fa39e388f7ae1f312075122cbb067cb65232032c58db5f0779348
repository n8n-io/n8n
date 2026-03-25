# Create a virtual environment with all tools installed
# ref: https://hub.docker.com/_/ubuntu
FROM ubuntu:latest AS env
LABEL maintainer="corentinl@google.com"
# Install system build dependencies
ENV PATH=/usr/local/bin:$PATH
RUN apt-get update -qq \
&& DEBIAN_FRONTEND=noninteractive apt-get install -yq git wget libssl-dev build-essential \
 ninja-build python3 pkgconf libglib2.0-dev \
&& apt-get clean \
&& rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
ENTRYPOINT ["/usr/bin/bash", "-c"]
CMD ["/usr/bin/bash"]

# Install CMake 3.21.3
RUN wget "https://cmake.org/files/v3.21/cmake-3.21.3-linux-x86_64.sh" \
&& chmod a+x cmake-3.21.3-linux-x86_64.sh \
&& ./cmake-3.21.3-linux-x86_64.sh --prefix=/usr/local/ --skip-license \
&& rm cmake-3.21.3-linux-x86_64.sh

FROM env AS devel
WORKDIR /home/project
COPY . .

FROM devel AS build
RUN cmake -version
RUN cmake -S. -Bbuild
RUN cmake --build build --target all -v
RUN cmake --build build --target install -v

FROM build AS test
ENV CTEST_OUTPUT_ON_FAILURE=1
RUN cmake --build build --target test -v

# Test install rules
FROM env AS install_env
COPY --from=build /usr/local /usr/local/

FROM install_env AS install_devel
WORKDIR /home/sample
COPY cmake/ci/sample .

FROM install_devel AS install_build
RUN cmake -S. -Bbuild
RUN cmake --build build --target all -v

FROM install_build AS install_test
RUN cmake --build build --target test
