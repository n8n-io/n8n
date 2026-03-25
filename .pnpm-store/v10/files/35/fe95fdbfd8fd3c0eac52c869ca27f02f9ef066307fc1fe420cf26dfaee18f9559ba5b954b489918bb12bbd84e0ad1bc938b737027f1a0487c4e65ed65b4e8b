const warn = console.warn; // eslint-disable-line no-console

/**
  You can use this class when you want more control over your route handlers response.

  Pass the `code`, `headers` and `data` into the constructor and return an instance from any route handler.

  ```js
  import { Response } from 'miragejs';

  this.get('/users', () => {
    return new Response(400, { some: 'header' }, { errors: [ 'name cannot be blank'] });
  });
  ```
*/
export default class Response {
  constructor(code, headers = {}, data) {
    this.code = code;
    this.headers = headers;

    // Default data for "undefined 204" responses to empty string (no content)
    if (code === 204) {
      if (data !== undefined && data !== "") {
        warn(
          `Mirage: One of your route handlers is returning a custom
          204 Response that has data, but this is a violation of the HTTP spec
          and could lead to unexpected behavior. 204 responses should have no
          content (an empty string) as their body.`
        );
      } else {
        this.data = "";
      }

      // Default data for "empty untyped" responses to empty JSON object
    } else if (
      (data === undefined || data === "") &&
      !Object.prototype.hasOwnProperty.call(this.headers, "Content-Type")
    ) {
      this.data = {};
    } else {
      this.data = data;
    }

    // Default "untyped" responses to application/json
    if (
      code !== 204 &&
      !Object.prototype.hasOwnProperty.call(this.headers, "Content-Type")
    ) {
      this.headers["Content-Type"] = "application/json";
    }
  }

  toRackResponse() {
    return [this.code, this.headers, this.data];
  }
}
