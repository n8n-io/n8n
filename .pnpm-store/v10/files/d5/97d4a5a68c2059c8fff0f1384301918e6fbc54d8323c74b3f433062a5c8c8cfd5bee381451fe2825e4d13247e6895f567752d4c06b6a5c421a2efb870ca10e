#define NAPI_VERSION 1
#include <assert.h>
#include <string.h>
#include <node_api.h>

napi_value IsValidUTF8(napi_env env, napi_callback_info info) {
  napi_status status;
  size_t argc = 1;
  napi_value argv[1];

  status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  assert(status == napi_ok);

  uint8_t *buf;
  size_t len;

  status = napi_get_buffer_info(env, argv[0], (void **)&buf, &len);
  assert(status == napi_ok);

  size_t i = 0;

  //
  // This code has been taken from utf8_check.c which was developed by
  // Markus Kuhn <http://www.cl.cam.ac.uk/~mgk25/>.
  //
  // For original code / licensing please refer to
  // https://www.cl.cam.ac.uk/%7Emgk25/ucs/utf8_check.c
  //
  while (i < len) {
    size_t j = i + 8;

    if (j <= len) {
      //
      // Read 8 bytes and check if they are ASCII.
      //
      uint64_t chunk;
      memcpy(&chunk, buf + i, 8);

      if ((chunk & 0x8080808080808080) == 0x00) {
        i = j;
        continue;
      }
    }

    while ((buf[i] & 0x80) == 0x00) { // 0xxxxxxx
      if (++i == len) {
        goto exit;
      }
    }

    if ((buf[i] & 0xe0) == 0xc0) {  // 110xxxxx 10xxxxxx
      if (
        i + 1 == len ||
        (buf[i + 1] & 0xc0) != 0x80 ||
        (buf[i] & 0xfe) == 0xc0  // overlong
      ) {
        break;
      }

      i += 2;
    } else if ((buf[i] & 0xf0) == 0xe0) {  // 1110xxxx 10xxxxxx 10xxxxxx
      if (
        i + 2 >= len ||
        (buf[i + 1] & 0xc0) != 0x80 ||
        (buf[i + 2] & 0xc0) != 0x80 ||
        (buf[i] == 0xe0 && (buf[i + 1] & 0xe0) == 0x80) ||  // overlong
        (buf[i] == 0xed && (buf[i + 1] & 0xe0) == 0xa0)  // surrogate (U+D800 - U+DFFF)
      ) {
        break;
      }

      i += 3;
    } else if ((buf[i] & 0xf8) == 0xf0) {  // 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
      if (
        i + 3 >= len ||
        (buf[i + 1] & 0xc0) != 0x80 ||
        (buf[i + 2] & 0xc0) != 0x80 ||
        (buf[i + 3] & 0xc0) != 0x80 ||
        (buf[i] == 0xf0 && (buf[i + 1] & 0xf0) == 0x80) ||  // overlong
        (buf[i] == 0xf4 && buf[i + 1] > 0x8f) || buf[i] > 0xf4  // > U+10FFFF
      ) {
        break;
      }

      i += 4;
    } else {
      break;
    }
  }

exit:;
  napi_value result;
  status = napi_get_boolean(env, i == len, &result);
  assert(status == napi_ok);

  return result;
}

napi_value Init(napi_env env, napi_value exports) {
  napi_status status;
  napi_value isValidUTF8;

  status = napi_create_function(env, NULL, 0, IsValidUTF8, NULL, &isValidUTF8);
  assert(status == napi_ok);

  return isValidUTF8;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
