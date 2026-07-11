ARG N8N_VERSION=snapshot

# POINTER-COMPRESSION PROBE: builder and runtime must run the same
# pointer-compressed Node binary. node-gyp derives addon build config from
# the running node's process.config, so compiling inside this image is what
# gives sqlite3 and isolated-vm the V8_COMPRESS_POINTERS ABI.
FROM platformatic/node-caged:26.3.1-alpine AS builder
COPY ./compiled /usr/local/lib/node_modules/n8n
RUN apk add --no-cache python3 make g++ linux-headers && \
    cd /usr/local/lib/node_modules/n8n && \
    npm rebuild sqlite3 && \
    # Rebuild isolated-vm from source. node-gyp-build's musl detection relies
    # on /etc/alpine-release which DHI Alpine omits, so the bundled prebuilt
    # loader picks the glibc binary and segfaults in musl pthread paths.
    # Removing prebuilds and invoking node-gyp directly avoids npm rebuild's
    # double-build behavior (built-in node-gyp + install-script node-gyp)
    # which races on dep-file state.
    # Use npm's bundled node-gyp rather than `npx node-gyp` so the toolchain
    # version is fixed by the pinned image digest instead of being fetched
    # from the registry at build time.
    rm -rf node_modules/isolated-vm/prebuilds && \
    cd node_modules/isolated-vm && \
    node /usr/local/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js rebuild --release -j max

# Assert the binary really has pointer compression, then exercise the
# freshly compiled isolated-vm inside the cage. A failure fails the build.
COPY <<'EOF' /tmp/ivm-pc-check.js
const assert = require('node:assert');
assert.strictEqual(
	process.config.variables.v8_enable_pointer_compression, 1,
	'node binary is not pointer-compressed',
);
const ivm = require('/usr/local/lib/node_modules/n8n/node_modules/isolated-vm');
(async () => {
	const iso = new ivm.Isolate({ memoryLimit: 64 });
	const ctx = await iso.createContext();
	assert.strictEqual(await ctx.eval('[1,2,3].map(x => x * 2).join(",")'), '2,4,6');
	let limited = false;
	try {
		await ctx.eval('const a = []; while (true) a.push(new Array(65536).fill(0));');
	} catch (error) {
		limited = true;
		console.log('memory limit enforced:', error.message.slice(0, 60));
	}
	assert.ok(limited, 'memory limit was not enforced');
	iso.dispose();
	const isolates = Array.from({ length: 6 }, () => new ivm.Isolate({ memoryLimit: 128 }));
	await Promise.all(
		isolates.map(async (isolate, index) => {
			const context = await isolate.createContext();
			assert.strictEqual(await context.eval('"iso" + ' + index), 'iso' + index);
		}),
	);
	const stats = isolates[0].getHeapStatisticsSync();
	console.log('isolate heap_size_limit MB:', Math.round(stats.heap_size_limit / 1048576));
	isolates.forEach((isolate) => isolate.dispose());
	console.log('IVM-PC-CHECK PASSED');
})().catch((error) => {
	console.error('IVM-PC-CHECK FAILED', error);
	process.exit(1);
});
EOF
RUN node /tmp/ivm-pc-check.js && rm /tmp/ivm-pc-check.js

# POINTER-COMPRESSION PROBE: runtime is the same node-caged image as the
# builder (same V8 ABI for the addons compiled above). Replicates the
# n8nio/base provisioning inline: OS packages, fonts, node user, and the
# node binary at /usr/local/bin/node that cloud launch and AppArmor expect
# (node-caged installs there natively).
FROM platformatic/node-caged:26.3.1-alpine

ARG N8N_VERSION
ARG N8N_RELEASE_TYPE=dev
ENV NODE_ENV=production
ENV N8N_RELEASE_TYPE=${N8N_RELEASE_TYPE}
ENV SHELL=/bin/sh
ENV NODE_PATH=/usr/local/lib/node_modules

RUN apk --no-cache add --virtual .build-deps-fonts msttcorefonts-installer fontconfig && \
    update-ms-fonts && \
    fc-cache -f && \
    apk del .build-deps-fonts && \
    find /usr/share/fonts/truetype/msttcorefonts/ -type l -exec unlink {} \; && \
    apk add --no-cache \
        git \
        openssh \
        graphicsmagick \
        tini \
        tzdata \
        ca-certificates \
        libc6-compat && \
    addgroup -g 1000 node && \
    adduser -u 1000 -G node -s /bin/sh -D node && \
    ln -sf /usr/local/bin/node /usr/bin/node && \
    rm -rf /tmp/* /root/.npm

WORKDIR /home/node

COPY --from=builder /usr/local/lib/node_modules/n8n /usr/local/lib/node_modules/n8n
COPY docker/images/n8n/docker-entrypoint.sh /

RUN ln -s /usr/local/lib/node_modules/n8n/bin/n8n /usr/local/bin/n8n && \
    mkdir -p /home/node/.n8n && \
    chown -R node:node /home/node && \
    rm -rf /root/.npm /tmp/*

EXPOSE 5678/tcp
USER node
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]

LABEL org.opencontainers.image.title="n8n" \
      org.opencontainers.image.description="Workflow Automation Tool" \
      org.opencontainers.image.source="https://github.com/n8n-io/n8n" \
      org.opencontainers.image.url="https://n8n.io" \
      org.opencontainers.image.version=${N8N_VERSION}
