FROM golang:1 AS build
WORKDIR /src
COPY go.mod main.go ./
RUN CGO_ENABLED=0 go build -o /activator .

# trixie ships criu 4.1.1, which chokes on kernel 7.x socket-option probing
# (SO_PASSCRED/SO_PASSSEC return EOPNOTSUPP on inet sockets) — build 4.2.1
FROM node:24-trixie-slim AS criubuild
RUN apt-get update && apt-get install -y --no-install-recommends \
	build-essential pkg-config python3 curl ca-certificates \
	libprotobuf-dev libprotobuf-c-dev protobuf-c-compiler protobuf-compiler python3-protobuf \
	libnl-3-dev libnet1-dev libcap-dev uuid-dev libbsd-dev libgnutls28-dev \
	&& rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://github.com/checkpoint-restore/criu/archive/refs/tags/v4.2.1.tar.gz | tar xz -C /opt
RUN make -C /opt/criu-4.2.1 criu -j"$(nproc)"

# n8n's official image is a hardened alpine without a package manager, and
# criu isn't packaged for musl — so debian base + npm-installed n8n instead.
FROM node:24-trixie-slim
# distro criu package pulls in the runtime libs; overwrite its binary with 4.2.1
RUN apt-get update \
	&& apt-get install -y --no-install-recommends criu iptables \
	&& rm -rf /var/lib/apt/lists/*
COPY --from=criubuild /opt/criu-4.2.1/criu/criu /usr/sbin/criu
RUN criu --version
RUN npm install -g n8n
COPY --from=build /activator /activator
ENTRYPOINT ["/activator"]
