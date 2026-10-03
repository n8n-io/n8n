FROM node@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6
WORKDIR /opt/native
RUN npm install --omit=dev --no-audit --no-fund sharp@0.34.4 && npm cache clean --force
