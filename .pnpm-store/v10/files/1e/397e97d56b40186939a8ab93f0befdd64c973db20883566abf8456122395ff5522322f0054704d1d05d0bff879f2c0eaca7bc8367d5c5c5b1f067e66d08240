#define NAPI_VERSION 1
#include <assert.h>
#include <node_api.h>

napi_value Mask(napi_env env, napi_callback_info info) {
  napi_status status;
  size_t argc = 5;
  napi_value argv[5];

  status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  assert(status == napi_ok);

  uint8_t *source;
  uint8_t *mask;
  uint8_t *destination;
  uint32_t offset;
  uint32_t length;

  status = napi_get_buffer_info(env, argv[0], (void **)&source, NULL);
  assert(status == napi_ok);

  status = napi_get_buffer_info(env, argv[1], (void **)&mask, NULL);
  assert(status == napi_ok);

  status = napi_get_buffer_info(env, argv[2], (void **)&destination, NULL);
  assert(status == napi_ok);

  status = napi_get_value_uint32(env, argv[3], &offset);
  assert(status == napi_ok);

  status = napi_get_value_uint32(env, argv[4], &length);
  assert(status == napi_ok);

  destination += offset;
  uint32_t index = 0;

  //
  // Alignment preamble.
  //
  while (index < length && ((size_t)source % 8)) {
    *destination++ = *source++ ^ mask[index % 4];
    index++;
  }

  length -= index;
  if (!length)
    return NULL;

  //
  // Realign mask and convert to 64 bit.
  //
  uint8_t maskAlignedArray[8];

  for (uint8_t i = 0; i < 8; i++, index++) {
    maskAlignedArray[i] = mask[index % 4];
  }

  //
  // Apply 64 bit mask in 8 byte chunks.
  //
  uint32_t loop = length / 8;
  uint64_t *pMask8 = (uint64_t *)maskAlignedArray;

  while (loop--) {
    uint64_t *pFrom8 = (uint64_t *)source;
    uint64_t *pTo8 = (uint64_t *)destination;
    *pTo8 = *pFrom8 ^ *pMask8;
    source += 8;
    destination += 8;
  }

  //
  // Apply mask to remaining data.
  //
  uint8_t *pmaskAlignedArray = maskAlignedArray;

  length %= 8;
  while (length--) {
    *destination++ = *source++ ^ *pmaskAlignedArray++;
  }

  return NULL;
}

napi_value Unmask(napi_env env, napi_callback_info info) {
  napi_status status;
  size_t argc = 2;
  napi_value argv[2];

  status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  assert(status == napi_ok);

  uint8_t *source;
  size_t length;
  uint8_t *mask;

  status = napi_get_buffer_info(env, argv[0], (void **)&source, &length);
  assert(status == napi_ok);

  status = napi_get_buffer_info(env, argv[1], (void **)&mask, NULL);
  assert(status == napi_ok);

  uint32_t index = 0;

  //
  // Alignment preamble.
  //
  while (index < length && ((size_t)source % 8)) {
    *source++ ^= mask[index % 4];
    index++;
  }

  length -= index;
  if (!length)
    return NULL;

  //
  // Realign mask and convert to 64 bit.
  //
  uint8_t maskAlignedArray[8];

  for (uint8_t i = 0; i < 8; i++, index++) {
    maskAlignedArray[i] = mask[index % 4];
  }

  //
  // Apply 64 bit mask in 8 byte chunks.
  //
  uint32_t loop = length / 8;
  uint64_t *pMask8 = (uint64_t *)maskAlignedArray;

  while (loop--) {
    uint64_t *pSource8 = (uint64_t *)source;
    *pSource8 ^= *pMask8;
    source += 8;
  }

  //
  // Apply mask to remaining data.
  //
  uint8_t *pmaskAlignedArray = maskAlignedArray;

  length %= 8;
  while (length--) {
    *source++ ^= *pmaskAlignedArray++;
  }

  return NULL;
}

napi_value Init(napi_env env, napi_value exports) {
  napi_status status;
  napi_value mask;
  napi_value unmask;

  status = napi_create_function(env, NULL, 0, Mask, NULL, &mask);
  assert(status == napi_ok);

  status = napi_create_function(env, NULL, 0, Unmask, NULL, &unmask);
  assert(status == napi_ok);

  status = napi_set_named_property(env, exports, "mask", mask);
  assert(status == napi_ok);

  status = napi_set_named_property(env, exports, "unmask", unmask);
  assert(status == napi_ok);

  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
