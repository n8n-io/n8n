FROM debian:7.4
MAINTAINER William Blankenship <william.jblankenship@gmail.com>

# Setup NodeSource Official PPA
RUN apt-get update && \
    apt-get install -y --force-yes \
      curl \
      apt-transport-https \
      lsb-release \
      build-essential \
      python-all

RUN curl -sL https://deb.nodesource.com/setup | bash -
RUN apt-get update
RUN apt-get install nodejs -y --force-yes

ADD . /usr/src/
WORKDIR /usr/src/

CMD ["node","test.js"]
