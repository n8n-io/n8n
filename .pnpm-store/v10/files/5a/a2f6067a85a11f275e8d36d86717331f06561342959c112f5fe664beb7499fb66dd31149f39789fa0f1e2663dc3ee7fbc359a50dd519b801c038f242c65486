Join all arguments together and normalize the resulting url.

## Install

~~~
npm install url-join
~~~

## Usage

~~~javascript
var urljoin = require('url-join');

var fullUrl = urljoin('http://www.google.com', 'a', '/b/cd', '?foo=123');

console.log(fullUrl);

~~~

Prints:

~~~
'http://www.google.com/a/b/cd?foo=123'
~~~

## Browser and AMD

It also works in the browser, you can either include ```lib/url-join.js``` in your page:

~~~html
<script src="url-join.js"></script>
<script type="text/javascript">
	urljoin('http://blabla.com', 'foo?a=1')
</script>
~~~

Or using an AMD module system like requirejs:

~~~javascript
define(['path/url-join.js'], function (urljoin) {
  urljoin('http://blabla.com', 'foo?a=1');
});
~~~

## License

MIT
