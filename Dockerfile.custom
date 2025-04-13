# Sử dụng image Node.js đầy đủ (không phải slim)
FROM node:20

# Cài Chrome dependencies và git
RUN apt-get update && apt-get install -y \
  chromium \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libnspr4 \
  libnss3 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils \
  wget \
  unzip \
  git \
  --no-install-recommends && \
  # Dọn dẹp apt cache
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

# Thiết lập biến môi trường Puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true
# Biến môi trường cho custom nodes
ENV NODE_FUNCTION_ALLOW_EXTERNAL=puppeteer,puppeteer-extra,puppeteer-extra-plugin-stealth,puppeteer-extra-plugin-human-typing

# Thiết lập biến để bỏ qua lefthook trong Docker build
ENV DOCKER_BUILD=true

# Tạo thư mục ứng dụng
WORKDIR /data

# Tạo thư mục cần thiết và cấp quyền cho user 'node'
RUN mkdir -p /home/node/.n8n && \
    chown -R node:node /data /home/node/.n8n

# Copy mã nguồn
COPY --chown=node:node . .

# Cài đặt pnpm toàn cục
USER root
RUN npm install -g pnpm@10.6.5

# Cài đặt dependencies
USER node
RUN pnpm install --prod --no-optional --ignore-scripts

# Expose cổng
EXPOSE 5678

# Lệnh khởi động
CMD ["pnpm", "start"]