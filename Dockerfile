FROM n8nio/n8n

# optional: If you need to install custom npm packages or n8n nodes later,
# you wolulduncomment and modify the lines below
# RUN apk add --no-cache some-package
# If you need to install npm packages, uncomment and modify the lines below
# RUN npm install -g your-custom-node-package
EXPOSE 5678

# Docker Command (Render): n8n start
CMD ["n8n"]
