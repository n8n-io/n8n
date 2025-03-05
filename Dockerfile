FROM node:18
WORKDIR /usr/src/app
COPY . .
RUN npm install
RUN npm run build
EXPOSE 5678
CMD ["n8n", "start"]
