# How to (re)build the Javascript from the C sources

You will *not* need to do this for a fresh checkout, since the project
policy is to include the generated javascript as a checked-in file.

## Ingredients

 - Python 2.x
 - Docker, or a recent Emscripten SDK
 - Node.js and npm to run the [mocha](http://visionmedia.github.io/mocha/)-based tests

Recently, I have had trouble getting a stable Emscripten setup on my
machines, so I now primarily use a
[Dockerized Emscripten](https://hub.docker.com/r/trzeci/emscripten/)
courtesy of Docker user `trzeci`.

Within the `js-nacl` directory,

 - [`nacl_cooked.js`](nacl_cooked.js) is the high-level Javascript
   interface to the low-level code.

 - [`nacl_cooked_prefix.js`](nacl_cooked_prefix.js) and
   [`nacl_cooked_suffix.js`](nacl_cooked_suffix.js) are wrapped
   around `nacl_cooked.js` and `libsodium.js` to create
   `lib/nacl_factory.js`.

 - [`test/runner.html`](test/runner.html) runs the Mocha tests in the browser.

 - [`test/tests.js`](test/tests.js) is the source code for the test cases themselves.

 - [`benchmark.html`](benchmark.html) and
   [`benchmark.js`](benchmark.js) are trivial speed measurements for
   running in the browser.

## Method

The `js-nacl` Makefile assumes the use of Docker Emscripten.

To rebuild everything:

    make veryclean all

This will completely remove any compilation products, and recompile
everything.

Other Makefile targets:

 - `make` or `make test`: builds the library if necessary and then
   runs the test suite using node.js.

 - `make clean`: removes generated Javascript, but does not remove the
   unpacked and pre-processed `libsodium` tarball contents.

 - `make veryclean`: as `make clean`, but also removes the contents of
   the `libsodium` tarball.

 - `make all`: performs all the build steps.

### Using the Emscripten SDK instead of Docker

If you are not using the Docker Emscripten image, follow the
instructions from the
[Emscripten tutorial](http://emscripten.org/Tutorial) to get
Emscripten ready to run.

Once `emcc` is on your `$PATH` somewhere, build the `libsodium.js`
file by unpacking the libsodium sources, applying patches as necessary
(see the Makefile), changing to the `dist-build` directory in the
unpacked sources, and running `./emscripten.sh --sumo`.

If you for some reason need to use a different python than `python`,
set the `PYTHON` makefile variable; for example,

    make PYTHON=python2.7

Similarly, set `EMCC` to the path to your `emcc` binary if it's not on
your `$PATH`.

## Serves three

The build products, Javascript for use in the browser and in node.js,
will be in `lib/*`.
