FROM fedora:20
MAINTAINER William Blankenship <william.jblankenship@gmail.com>

RUN yum install -y nodejs npm

ADD . /usr/src/
WORKDIR /usr/src/

CMD ["node","test.js"]
