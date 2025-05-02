FROM n8nio/base:20

# Install base dependencies
RUN apk add --no-cache --update openssh sudo shadow bash curl unzip

# Install ngrok for Alpine
RUN curl -o /tmp/ngrok.zip https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.zip \
    && unzip /tmp/ngrok.zip -d /usr/local/bin \
    && rm /tmp/ngrok.zip \
    && chmod +x /usr/local/bin/ngrok

# Configure sudo for node user
RUN echo node ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/node && chmod 0440 /etc/sudoers.d/node

# Set up workspace permissions
RUN mkdir /workspaces && chown node:node /workspaces

# Configure pnpm
USER node
RUN mkdir -p ~/.pnpm-store && pnpm config set store-dir ~/.pnpm-store --global

# Set ngrok authentication (using build-time secrets)
ARG NGROK_AUTHTOKEN
ARG NGROK_API_KEY
RUN if [ -n "$NGROK_AUTHTOKEN" ]; then \
      ngrok config add-authtoken "$NGROK_AUTHTOKEN" && \
      ngrok config add-api-key "$NGROK_API_KEY"; \
    fi
