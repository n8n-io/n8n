# Build stage - separate to keep runtime image small
FROM node:20-slim AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json tsconfig.json ./

# Install all dependencies (including dev for build)
RUN pnpm install --no-lockfile

# Copy source and build
COPY src ./src
RUN pnpm build

# Prune dev dependencies for smaller runtime
RUN pnpm prune --prod

# Runtime stage
FROM debian:bookworm-slim AS runtime

ENV DEBIAN_FRONTEND=noninteractive

# Install all system dependencies in a single layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    # X11 and display
    xvfb \
    x11vnc \
    openbox \
    tint2 \
    # Input control
    xdotool \
    # Screenshot tools
    scrot \
    # Image processing
    imagemagick \
    # Browser
    chromium \
    # File manager and terminal
    pcmanfm \
    xterm \
    # Text editor
    mousepad \
    # Node.js runtime only
    nodejs \
    # Fonts
    fonts-liberation \
    fonts-dejavu-core \
    # Minimal utils
    procps \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/chromium /usr/bin/google-chrome

# Create user and setup directories
RUN useradd -m -s /bin/bash computeruse && \
    mkdir -p /home/computeruse/.vnc && \
    # Create X11 socket directory with correct ownership to avoid warning
    mkdir -p /tmp/.X11-unix && \
    chmod 1777 /tmp/.X11-unix && \
    # Create empty openbox menu to suppress warning
    mkdir -p /var/lib/openbox && \
    echo '<?xml version="1.0" encoding="UTF-8"?><openbox_menu xmlns="http://openbox.org/"><menu id="root-menu" label="Menu"></menu></openbox_menu>' > /var/lib/openbox/debian-menu.xml && \
    chown -R computeruse:computeruse /home/computeruse

# Set display environment
ENV DISPLAY=:1
ENV WIDTH=1280
ENV HEIGHT=800

WORKDIR /home/computeruse/api

# Copy built application (production deps only)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Copy startup scripts and config
COPY docker/entrypoint.sh docker/start_services.sh /home/computeruse/
RUN mkdir -p /home/computeruse/.config/tint2
COPY docker/tint2rc /home/computeruse/.config/tint2/tint2rc

RUN chmod +x /home/computeruse/entrypoint.sh /home/computeruse/start_services.sh && \
    chown -R computeruse:computeruse /home/computeruse

USER computeruse

EXPOSE 8080 5900

ENTRYPOINT ["/home/computeruse/entrypoint.sh"]
