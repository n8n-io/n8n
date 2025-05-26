#!/bin/bash

# Build the chat package
echo "Building chat package..."
pnpm build

# Create static directory if it doesn't exist
mkdir -p ~/.cache/n8n/public/static/chat

# Copy built files
echo "Copying files to n8n static directory..."
cp dist/chat.bundle.es.js ~/.cache/n8n/public/static/chat/
cp dist/chat.css ~/.cache/n8n/public/static/chat/style.css

echo "✅ Chat files copied to ~/.cache/n8n/public/static/chat/"
echo "The hosted chat will now use your local build when NODE_ENV=development"
