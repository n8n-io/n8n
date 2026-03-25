Because of [reasonable security doubts](https://github.com/dcodeIO/bcrypt.js/issues/16), these files, which used to be
a part of bcrypt-isaac.js, are no longer used but are kept here for reference only.

What is required instead is a proper way to collect entropy sources (using an intermediate stream cipher) which is then
used to seed the CSPRNG. Pick one and use `bcrypt.setRandomFallback` instead.
