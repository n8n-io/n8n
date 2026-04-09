## Strings & Bytes

Miscellaneous string & byte encoding and decoding functionality provided for compatibility across supported versions of V8 and Node. Implemented by NAN to ensure that all encoding types are supported, even for older versions of Node where they are missing.

 - <a href="#api_nan_encoding"><b><code>Nan::Encoding</code></b></a>
 - <a href="#api_nan_encode"><b><code>Nan::Encode()</code></b></a>
 - <a href="#api_nan_try_encode"><b><code>Nan::TryEncode()</code></b></a>
 - <a href="#api_nan_decode_bytes"><b><code>Nan::DecodeBytes()</code></b></a>
 - <a href="#api_nan_decode_write"><b><code>Nan::DecodeWrite()</code></b></a>


<a name="api_nan_encoding"></a>
### Nan::Encoding

An enum representing the supported encoding types. A copy of `node::encoding` that is consistent across versions of Node.

Definition:

```c++
enum Nan::Encoding { ASCII, UTF8, BASE64, UCS2, BINARY, HEX, BUFFER }
```


<a name="api_nan_encode"></a>
### Nan::Encode()

A wrapper around `node::Encode()` that provides a consistent implementation across supported versions of Node.

**Note** `node::Encode()` was deprecated in Node 24 but will remain to maintain backwards compatibility. For Node 24 and higher consider using [`Nan::TryEncode()`](#api_nan_try_encode).

Signature:

```c++
v8::Local<v8::Value> Nan::Encode(const void *buf,
                                 size_t len,
                                 enum Nan::Encoding encoding = BINARY);
```


<a name="api_nan_try_encode"></a>
### Nan::TryEncode()

A wrapper around `node::TryEncode()` that provides a consistent implementation across supported versions of Node.

**Note** Only available in Node 24 and higher. For earlier versions use  [`Nan::Encode()`](#api_nan_encode).

Signature:

```c++
Nan::MaybeLocal<v8::Value> Nan::TryEncode(const void *buf,
                                 size_t len,
                                 enum Nan::Encoding encoding = BINARY);
```


<a name="api_nan_decode_bytes"></a>
### Nan::DecodeBytes()

A wrapper around `node::DecodeBytes()` that provides a consistent implementation across supported versions of Node.

Signature:

```c++
ssize_t Nan::DecodeBytes(v8::Local<v8::Value> val,
                         enum Nan::Encoding encoding = BINARY);
```


<a name="api_nan_decode_write"></a>
### Nan::DecodeWrite()

A wrapper around `node::DecodeWrite()` that provides a consistent implementation across supported versions of Node.

Signature:

```c++
ssize_t Nan::DecodeWrite(char *buf,
                         size_t len,
                         v8::Local<v8::Value> val,
                         enum Nan::Encoding encoding = BINARY);
```
