FROM n8nio/n8n
If you need to install system packages, uncomment and modify the lines below
RUN apk add --no-cache some-package
If you need to install npm packages, uncomment and modify the lines below
RUN npm install -g your-custom-node-package
EXPOSE 5678
CMD ["n8n", "start"]
Docker Command (Render): n8n start
