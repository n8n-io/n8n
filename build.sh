#!/bin/bash

# Install dependencies and build
pnpm install && pnpm build:deploy && docker build -f docker/images/n8n/Dockerfile -t superpaulynn8n:latest .
