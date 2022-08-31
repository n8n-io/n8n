// setting webpack publickPath on the fly to fix MonacoWebpackPlugin errors
export default __webpack_public_path__ = window.BASE_PATH === '/%BASE_PATH%/' ? '/' : window.BASE_PATH;
