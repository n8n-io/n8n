# Sử dụng image Node.js chính thức làm base image
FROM node:18-alpine  # Hoặc phiên bản node khác mà n8n hỗ trợ

# Cài đặt các gói hệ thống cần thiết cho Puppeteer (đây là phần quan trọng!)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Đặt thư mục làm việc trong container
WORKDIR /usr/src/app

# Sao chép package.json và package-lock.json (nếu có)
COPY package*.json ./
COPY lerna.json ./
COPY packages/design-system/package.json ./packages/design-system/
COPY packages/cli/package.json ./packages/cli/
COPY packages/core/package.json ./packages/core/
COPY packages/editor-ui/package.json ./packages/editor-ui/
COPY packages/nodes-base/package.json ./packages/nodes-base/
COPY packages/workflow/package.json ./packages/workflow/

# Install dependencies
RUN npm install --only=production  # Chỉ cài đặt dependencies production

# Copy the rest of your app's source code from your host to your image filesystem.
COPY . .
RUN npm run build

# Cổng mà n8n sẽ chạy
EXPOSE 5678

# Lệnh để chạy n8n
CMD ["npm", "run", "start"]
