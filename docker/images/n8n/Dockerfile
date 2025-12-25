ARG NODE_VERSION=22.21.1
ARG N8N_VERSION=snapshot

# ==============================================================================
# STAGE 1: System Dependencies & Base Setup
# ==============================================================================
FROM n8nio/base:${NODE_VERSION} AS system-deps

# ==============================================================================
# STAGE 2: Final Runtime Image
# ==============================================================================
FROM system-deps AS runtime

ARG N8N_VERSION
ARG N8N_RELEASE_TYPE=dev
ENV NODE_ENV=production
ENV N8N_RELEASE_TYPE=${N8N_RELEASE_TYPE}
ENV NODE_ICU_DATA=/usr/local/lib/node_modules/full-icu
ENV SHELL=/bin/sh

WORKDIR /home/node

COPY ./compiled /usr/local/lib/node_modules/n8n
COPY docker/images/n8n/docker-entrypoint.sh /

# This version of npm has the fix for glob
RUN npm install -g npm@11.6.4

RUN cd /usr/local/lib/node_modules/n8n && \
		npm rebuild sqlite3 && \
		ln -s /usr/local/lib/node_modules/n8n/bin/n8n /usr/local/bin/n8n && \
    mkdir -p /home/node/.n8n && \
    chown -R node:node /home/node

EXPOSE 5678/tcp
USER node
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]

LABEL org.opencontainers.image.title="n8n" \
      org.opencontainers.image.description="Workflow Automation Tool" \
      org.opencontainers.image.source="https://github.com/n8n-io/n8n" \
      org.opencontainers.image.url="https://n8n.io" \
      org.opencontainers.image.version=${N8N_VERSION}{
  "name": "APEIRON_TEST_VIRAL",
  "nodes": [
    {
      "parameters": {},
      "id": "trigger-manual",
      "name": "When clicking ‘Execute Workflow’",
      "type": "n8n-nodes-base.manualTrigger",
      "typeVersion": 1,
      "position": [0, 300]
    },
    {
      "parameters": {
        "operation": "read",
        "fileName": "C:/Users/Dell/.gemini/antigravity/scratch/ProyectoAPEIRON/BUSINESS_HQ/MEDIA_HQ/OUTPUT/vivir_ia_2026_es.mp3"
      },
      "id": "leer-archivo",
      "name": "Leer Audio de Prueba",
      "type": "n8n-nodes-base.readFile",
      "typeVersion": 1,
      "position": [200, 300]
    },
    {
      "parameters": {
        "url": "https://api.deepgram.com/v1/listen",
        "method": "POST",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "Token b3e080f13a4fa37fb1a64f24501d9cb357598b5e"
            }
          ]
        },
        "sendBody": true,
        "contentType": "multipart-form-data",
        "bodyParameters": {
          "parameters": [
            {
              "name": "model",
              "value": "nova-2"
            }
          ]
        }
      },
      "id": "transcribir",
      "name": "Transcribir con Deepgram",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [450, 300]
    },
    {
      "parameters": {
        "model": "gemini-1.5-pro",
        "prompt": "=Analiza esta transcripción y dime: 1. El sentimiento principal, 2. El tono (¿Es agresivo, inspirador, informativo?), 3. Una sugerencia para hacerlo 10x más viral en TikTok.\n\nContenido: {{$json.results.channels[0].alternatives[0].transcript}}"
      },
      "id": "gemini-analisis",
      "name": "Cerebro Gemini: Análisis Viral",
      "type": "n8n-nodes-base.googleGemini",
      "typeVersion": 1,
      "position": [700, 300]
    }
  ],
  "connections": {
    "When clicking ‘Execute Workflow’": { "main": [[{ "node": "leer-archivo", "type": "main", "index": 0 }]] },
    "leer-archivo": { "main": [[{ "node": "transcribir", "type": "main", "index": 0 }]] },
    "transcribir": { "main": [[{ "node": "gemini-analisis", "type": "main", "index": 0 }]] }
  }
}
