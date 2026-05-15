ARG NODE_VERSION=24.15.0

FROM node:${NODE_VERSION}-alpine3.23

ENV NODE_ENV=production

RUN apk add --no-cache tini

WORKDIR /app

# `compiled/` is produced by `pnpm build:docker`. It's a `pnpm deploy --prod`
# output containing package.json, dist/, and a node_modules with only
# production dependencies — no devDeps, no workspace bloat.
COPY --chown=node:node ./compiled /app

USER node
EXPOSE 3000

ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/serve.js"]
