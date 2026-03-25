FROM node:dubnium-alpine
LABEL maintainer="mike.ralphson@gmail.com" description="Swagger to OpenAPI"
ENV NODE_ENV=production

WORKDIR /usr/src/app

# install the app
RUN npm i -g swagger2openapi

CMD [ "swagger2openapi", "--help" ]
