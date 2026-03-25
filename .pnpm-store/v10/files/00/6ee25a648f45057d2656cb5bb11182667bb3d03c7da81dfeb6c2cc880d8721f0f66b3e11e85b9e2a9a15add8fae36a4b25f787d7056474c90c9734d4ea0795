FROM alpine:3.3

MAINTAINER David Routhieau "rootio@protonmail.com"

RUN apk add --update --no-cache \
    nodejs

ADD . /usr/src/
WORKDIR /usr/src/

CMD ["node", "test.js"]
