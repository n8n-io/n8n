export default class FakeXMLHttpRequest extends XMLHttpRequest {
  requestBody: string;

  requestHeaders: {[k: string]: string};
  /*
    Forces a response on to the FakeXMLHttpRequest object.

    This is the public API for faking responses. This function
    takes a number status, headers object, and string body:

    ```
    xhr.respond(404, {Content-Type: 'text/plain'}, "Sorry. This object was not found.")
    ```
  */
  respond(
    statusCode: number,
    headersObject?: {
      [k: string]: string;
    },
    bodyText?: string
  ): void;
}
