#if defined(__GNUC__) && __GNUC__ >= 8
#define DISABLE_WCAST_FUNCTION_TYPE _Pragma("GCC diagnostic push") _Pragma("GCC diagnostic ignored \"-Wcast-function-type\"")
#define DISABLE_WCAST_FUNCTION_TYPE_END _Pragma("GCC diagnostic pop")
#else
#define DISABLE_WCAST_FUNCTION_TYPE
#define DISABLE_WCAST_FUNCTION_TYPE_END
#endif

#include <stdio.h>
#include <string.h>
#include <assert.h>

DISABLE_WCAST_FUNCTION_TYPE
#include <node.h>
#include <node_buffer.h>
#include <nan.h>
DISABLE_WCAST_FUNCTION_TYPE_END

#if NODE_MAJOR_VERSION >= 17
#  include <openssl/configuration.h>
#endif

#include <openssl/err.h>
#include <openssl/evp.h>
#include <openssl/hmac.h>

#ifndef _WIN32
#  include <dlfcn.h>
#endif

typedef int (*ctx_iv_len_func)(const EVP_CIPHER_CTX*);
typedef int (*ctx_key_len_func)(const EVP_CIPHER_CTX*);
typedef int (*ctx_get_block_size_func)(const EVP_CIPHER_CTX*);
typedef int (*cipher_flags_func)(const EVP_CIPHER*);
ctx_iv_len_func ctx_iv_len = nullptr;
ctx_key_len_func ctx_key_len = nullptr;
ctx_get_block_size_func ctx_get_block_size = nullptr;
cipher_flags_func cipher_flags = nullptr;

#if REAL_OPENSSL_MAJOR < 3
#  undef EVP_DigestSignUpdate
#  define EVP_DigestSignUpdate EVP_DigestUpdate
#  undef EVP_PKEY_OP_SIGNCTX
#  define EVP_PKEY_OP_SIGNCTX (1 << 6)
#endif

using namespace node;
using namespace v8;
using namespace std;

struct MarkPopErrorOnReturn {
  MarkPopErrorOnReturn() { ERR_set_mark(); }
  ~MarkPopErrorOnReturn() { ERR_pop_to_mark(); }
};

enum ErrorType {
  kErrNone,
  kErrOpenSSL,
  kErrBadIVLen,
  kErrBadKeyLen,
  kErrAADFailure,
  kErrTagFailure,
  kErrPartialEncrypt,
  kErrBadCipherName,
  kErrBadHMACName,
  kErrBadHMACLen,
  kErrBadInit,
  kErrPartialDecrypt,
  kErrInvalidMAC,
  kErrBadBlockLen
};

#define MAX_MAC_LEN 64

#define POLY1305_KEYLEN   32
#define POLY1305_TAGLEN   16
class ChaChaPolyCipher : public ObjectWrap {
 public:
  static NAN_MODULE_INIT(Init) {
    Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(New);
    tpl->SetClassName(Nan::New("ChaChaPolyCipher").ToLocalChecked());
    tpl->InstanceTemplate()->SetInternalFieldCount(1);

    SetPrototypeMethod(tpl, "encrypt", Encrypt);
    SetPrototypeMethod(tpl, "free", Free);

    Local<Function> func = Nan::GetFunction(tpl).ToLocalChecked();
    Local<Context> context = Nan::GetCurrentContext();
    v8::Isolate* isolate = context->GetIsolate();

    constructor().Set(isolate, func);

    Nan::Set(target,
             Nan::New("ChaChaPolyCipher").ToLocalChecked(),
             func);
  }

 private:
  explicit ChaChaPolyCipher()
    : ctx_main_(nullptr),
      ctx_pktlen_(nullptr),
#if REAL_OPENSSL_MAJOR >= 3
      mac_(nullptr),
      mac_ctx_(nullptr) {}
#else
      md_ctx_(nullptr),
      polykey_(nullptr),
      polykey_ctx_(nullptr) {}
#endif

  ~ChaChaPolyCipher() {
    clear();
  }

  void clear() {
    if (ctx_pktlen_) {
      EVP_CIPHER_CTX_free(ctx_pktlen_);
      ctx_pktlen_ = nullptr;
    }
    if (ctx_main_) {
      EVP_CIPHER_CTX_free(ctx_main_);
      ctx_main_ = nullptr;
    }
#if REAL_OPENSSL_MAJOR >= 3
    if (mac_ctx_) {
      EVP_MAC_CTX_free(mac_ctx_);
      mac_ctx_ = nullptr;
    }
    if (mac_) {
      EVP_MAC_free(mac_);
      mac_ = nullptr;
    }
#else
    if (polykey_) {
      EVP_PKEY_free(polykey_);
      polykey_ = nullptr;
    }
    if (md_ctx_) {
      EVP_MD_CTX_free(md_ctx_);
      md_ctx_ = nullptr;
    }
    // `polykey_ctx_` is not explicitly freed as it is freed implicitly when
    // `md_ctx_` is freed
#endif
  }

  ErrorType init(unsigned char* keys, size_t keys_len) {
    ErrorType r = kErrNone;
    const EVP_CIPHER* const cipher = EVP_get_cipherbyname("chacha20");

    if (keys_len != 64) {
      r = kErrBadKeyLen;
      goto out;
    }

    if (cipher == nullptr) {
      r = kErrOpenSSL;
      goto out;
    }

    if ((ctx_pktlen_ = EVP_CIPHER_CTX_new()) == nullptr
        || (ctx_main_ = EVP_CIPHER_CTX_new()) == nullptr
#if REAL_OPENSSL_MAJOR >= 3
        || (mac_ = EVP_MAC_fetch(nullptr,
                                 "POLY1305",
                                 "provider=default")) == nullptr
        || (mac_ctx_ = EVP_MAC_CTX_new(mac_)) == nullptr
#else
        || (md_ctx_ = EVP_MD_CTX_new()) == nullptr
#endif
        || EVP_EncryptInit_ex(ctx_pktlen_,
                              cipher,
                              nullptr,
                              keys + 32,
                              nullptr) != 1
        || EVP_EncryptInit_ex(ctx_main_,
                              cipher,
                              nullptr,
                              keys,
                              nullptr) != 1) {
      r = kErrOpenSSL;
      goto out;
    }
    if (ctx_iv_len(ctx_pktlen_) != 16) {
      r = kErrBadIVLen;
      goto out;
    }

out:
    return r;
  }

  ErrorType encrypt(unsigned char* packet,
                    uint32_t packet_len,
                    uint32_t seqno) {
    ErrorType r = kErrNone;
    size_t sig_len = 16;
    int outlen = 0;

    // `packet` layout:
    //   <packet length> <padding length> <payload> <padding> <poly1305 mac>
    uint32_t data_len = packet_len - POLY1305_TAGLEN;

    unsigned char polykey[POLY1305_KEYLEN] = {0};

    uint8_t seqbuf[16] = {0};
    ((uint8_t*)(seqbuf))[12] = (seqno >> 24) & 0xff;
    ((uint8_t*)(seqbuf))[13] = (seqno >> 16) & 0xff;
    ((uint8_t*)(seqbuf))[14] = (seqno >> 8) & 0xff;
    ((uint8_t*)(seqbuf))[15] = seqno & 0xff;

    // Generate Poly1305 key
    if (EVP_EncryptInit_ex(ctx_main_, nullptr, nullptr, nullptr, seqbuf) != 1) {
      r = kErrOpenSSL;
      goto out;
    }
    if (EVP_EncryptUpdate(ctx_main_,
                          polykey,
                          &outlen,
                          polykey,
                          sizeof(polykey)) != 1) {
      r = kErrOpenSSL;
      goto out;
    }
    if (static_cast<size_t>(outlen) != sizeof(polykey)) {
      r = kErrPartialEncrypt;
      goto out;
    }

    // Encrypt packet length
    if (EVP_EncryptInit_ex(ctx_pktlen_,
                           nullptr,
                           nullptr,
                           nullptr,
                           seqbuf) != 1) {
      r = kErrOpenSSL;
      goto out;
    }
    if (EVP_EncryptUpdate(ctx_pktlen_, packet, &outlen, packet, 4) != 1) {
      r = kErrOpenSSL;
      goto out;
    }
    if (static_cast<size_t>(outlen) != 4) {
      r = kErrPartialEncrypt;
      goto out;
    }

    // Encrypt rest of packet
    seqbuf[0] = 1;
    if (EVP_EncryptInit_ex(ctx_main_, nullptr, nullptr, nullptr, seqbuf) != 1) {
      r = kErrOpenSSL;
      goto out;
    }
    if (EVP_EncryptUpdate(ctx_main_,
                          packet + 4,
                          &outlen,
                          packet + 4,
                          data_len - 4) != 1) {
      r = kErrOpenSSL;
      goto out;
    }
    if (static_cast<size_t>(outlen) != data_len - 4) {
      r = kErrPartialEncrypt;
      goto out;
    }

    // Poly1305 over ciphertext
#if REAL_OPENSSL_MAJOR >= 3
    // TODO: check if dup()'ing a "base" context instead of calling init() with
    //       the key each time is faster
    if (EVP_MAC_init(mac_ctx_, polykey, sizeof(polykey), nullptr) != 1
        || EVP_MAC_update(mac_ctx_, packet, data_len) != 1
        || EVP_MAC_final(mac_ctx_, packet + data_len, &sig_len, sig_len) != 1) {
      r = kErrOpenSSL;
      goto out;
    }
#else
    if (polykey_) {
      if (EVP_PKEY_CTX_ctrl(polykey_ctx_,
                            -1,
                            EVP_PKEY_OP_SIGNCTX,
                            EVP_PKEY_CTRL_SET_MAC_KEY,
                            sizeof(polykey),
                            (void*)polykey) <= 0) {
        r = kErrOpenSSL;
        goto out;
      }
    } else {
      polykey_ = EVP_PKEY_new_raw_private_key(EVP_PKEY_POLY1305,
                                              nullptr,
                                              polykey,
                                              sizeof(polykey));
      if (polykey_ == nullptr) {
        r = kErrOpenSSL;
        goto out;
      }

      if (!EVP_DigestSignInit(md_ctx_,
                              &polykey_ctx_,
                              nullptr,
                              nullptr,
                              polykey_)) {
        r = kErrOpenSSL;
        goto out;
      }
    }

    // Generate and write Poly1305 tag
    if (EVP_DigestSign(md_ctx_,
                       packet + data_len,
                       &sig_len,
                       packet,
                       data_len) != 1) {
      r = kErrOpenSSL;
      goto out;
    }
#endif

    out:
      return r;
  }

  static NAN_METHOD(New) {
    MarkPopErrorOnReturn mark_pop_error_on_return;

    if (!Buffer::HasInstance(info[0]))
      return Nan::ThrowTypeError("Missing/Invalid keys");

    ChaChaPolyCipher* obj = new ChaChaPolyCipher();
    ErrorType r = obj->init(
      reinterpret_cast<unsigned char*>(Buffer::Data(info[0])),
      Buffer::Length(info[0])
    );
    if (r != kErrNone) {
      if (r == kErrOpenSSL) {
        char msg_buf[128] = {0};
        ERR_error_string_n(ERR_get_error(), msg_buf, sizeof(msg_buf));
        ERR_clear_error();
        obj->clear();
        delete obj;
        return Nan::ThrowError(msg_buf);
      }
      obj->clear();
      delete obj;
      switch (r) {
        case kErrBadKeyLen:
          return Nan::ThrowError("Invalid keys length");
        case kErrBadIVLen:
          return Nan::ThrowError("Invalid IV length");
        default:
          return Nan::ThrowError("Unknown init failure");
      }
    }

    obj->Wrap(info.This());
    info.GetReturnValue().Set(info.This());
  }

  static NAN_METHOD(Encrypt) {
    MarkPopErrorOnReturn mark_pop_error_on_return;

    ChaChaPolyCipher* obj = ObjectWrap::Unwrap<ChaChaPolyCipher>(info.Holder());

    if (!Buffer::HasInstance(info[0]))
      return Nan::ThrowTypeError("Missing/Invalid packet");

    if (!info[1]->IsUint32())
      return Nan::ThrowTypeError("Missing/Invalid sequence number");

    ErrorType r = obj->encrypt(
      reinterpret_cast<unsigned char*>(Buffer::Data(info[0])),
      Buffer::Length(info[0]),
      Nan::To<uint32_t>(info[1]).FromJust()
    );
    switch (r) {
      case kErrNone:
        return;
      case kErrOpenSSL: {
        char msg_buf[128] = {0};
        ERR_error_string_n(ERR_get_error(), msg_buf, sizeof(msg_buf));
        ERR_clear_error();
        return Nan::ThrowError(msg_buf);
      }
      default:
        return Nan::ThrowError("Unknown encrypt failure");
    }
  }

  static NAN_METHOD(Free) {
    ChaChaPolyCipher* obj = ObjectWrap::Unwrap<ChaChaPolyCipher>(info.Holder());
    obj->clear();
  }

  static inline v8::Eternal<v8::Function> & constructor() {
    static v8::Eternal<v8::Function> my_constructor;
    return my_constructor;
  }

  EVP_CIPHER_CTX* ctx_main_;
  EVP_CIPHER_CTX* ctx_pktlen_;
#if REAL_OPENSSL_MAJOR >= 3
  EVP_MAC* mac_;
  EVP_MAC_CTX* mac_ctx_;
#else
  EVP_MD_CTX* md_ctx_;
  EVP_PKEY* polykey_;
  EVP_PKEY_CTX* polykey_ctx_;
#endif
};

class AESGCMCipher : public ObjectWrap {
 public:
  static NAN_MODULE_INIT(Init) {
    Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(New);
    tpl->SetClassName(Nan::New("AESGCMCipher").ToLocalChecked());
    tpl->InstanceTemplate()->SetInternalFieldCount(1);

    SetPrototypeMethod(tpl, "encrypt", Encrypt);
    SetPrototypeMethod(tpl, "free", Free);

    Local<Function> func = Nan::GetFunction(tpl).ToLocalChecked();
    Local<Context> context = Nan::GetCurrentContext();
    v8::Isolate* isolate = context->GetIsolate();

    constructor().Set(isolate, func);

    Nan::Set(target,
             Nan::New("AESGCMCipher").ToLocalChecked(),
             func);
  }

 private:
  explicit AESGCMCipher() : ctx_(nullptr) {}

  ~AESGCMCipher() {
    clear();
  }

  void clear() {
    if (ctx_) {
      EVP_CIPHER_CTX_free(ctx_);
      ctx_ = nullptr;
    }
  }

  ErrorType init(const char* name,
                 unsigned char* key,
                 size_t key_len,
                 unsigned char* iv,
                 size_t iv_len) {
    ErrorType r = kErrNone;

    const EVP_CIPHER* const cipher = EVP_get_cipherbyname(name);
    if (cipher == nullptr) {
      r = kErrOpenSSL;
      goto out;
    }

    if (cipher != EVP_aes_128_gcm() && cipher != EVP_aes_256_gcm()) {
      r = kErrBadCipherName;
      goto out;
    }

    if ((ctx_ = EVP_CIPHER_CTX_new()) == nullptr
        || EVP_EncryptInit_ex(ctx_, cipher, nullptr, nullptr, nullptr) != 1) {
      r = kErrOpenSSL;
      goto out;
    }

    if (!EVP_CIPHER_CTX_ctrl(ctx_, EVP_CTRL_AEAD_SET_IVLEN, iv_len, nullptr)) {
      r = kErrOpenSSL;
      goto out;
    }

    if (key_len != static_cast<size_t>(ctx_key_len(ctx_))) {
      if (!EVP_CIPHER_CTX_set_key_length(ctx_, key_len)) {
        r = kErrBadKeyLen;
        goto out;
      }
    }

    // Set key and IV
    if (EVP_EncryptInit_ex(ctx_, nullptr, nullptr, key, iv) != 1) {
      r = kErrOpenSSL;
      goto out;
    }
    if (!EVP_CIPHER_CTX_ctrl(ctx_, EVP_CTRL_GCM_SET_IV_FIXED, -1, iv)) {
      r = kErrOpenSSL;
      goto out;
    }

    // Disable padding
    EVP_CIPHER_CTX_set_padding(ctx_, 0);

out:
    return r;
  }

  ErrorType encrypt(unsigned char* packet, uint32_t packet_len) {
    ErrorType r = kErrNone;

    // `packet` layout:
    //   <packet length> <padding length> <payload> <padding> <mac>
    uint32_t data_len = packet_len - 16;

    int outlen = 0;

    // Increment IV
    unsigned char lastiv[1];
    if (!EVP_CIPHER_CTX_ctrl(ctx_, EVP_CTRL_GCM_IV_GEN, 1, lastiv)) {
      r = kErrOpenSSL;
      goto out;
    }

    // Set AAD (the packet length)
    if (!EVP_EncryptUpdate(ctx_, nullptr, &outlen, packet, 4)) {
      r = kErrOpenSSL;
      goto out;
    }
    if (outlen != 4) {
      r = kErrAADFailure;
      goto out;
    }

    // Encrypt everything but the packet length
    if (EVP_EncryptUpdate(ctx_,
                          packet + 4,
                          &outlen,
                          packet + 4,
                          data_len - 4) != 1) {
      r = kErrOpenSSL;
      goto out;
    }
    if (static_cast<size_t>(outlen) != data_len - 4) {
      r = kErrPartialEncrypt;
      goto out;
    }

    // Generate authentication tag
    if (!EVP_EncryptFinal_ex(ctx_, nullptr, &outlen)) {
      r = kErrOpenSSL;
      goto out;
    }

    // Write authentication tag
    if (EVP_CIPHER_CTX_ctrl(ctx_,
                            EVP_CTRL_AEAD_GET_TAG,
                            16,
                            packet + data_len) != 1) {
      r = kErrOpenSSL;
      goto out;
    }

out:
    return r;
  }

  static NAN_METHOD(New) {
    MarkPopErrorOnReturn mark_pop_error_on_return;

    if (!info[0]->IsString())
      return Nan::ThrowTypeError("Missing/Invalid OpenSSL cipher name");

    if (!Buffer::HasInstance(info[1]))
      return Nan::ThrowTypeError("Missing/Invalid key");

    if (!Buffer::HasInstance(info[2]))
      return Nan::ThrowTypeError("Missing/Invalid iv");

    const Nan::Utf8String cipher_name(info[0]);

    AESGCMCipher* obj = new AESGCMCipher();
    ErrorType r = obj->init(
      *cipher_name,
      reinterpret_cast<unsigned char*>(Buffer::Data(info[1])),
      Buffer::Length(info[1]),
      reinterpret_cast<unsigned char*>(Buffer::Data(info[2])),
      Buffer::Length(info[2])
    );
    if (r != kErrNone) {
      if (r == kErrOpenSSL) {
        char msg_buf[128] = {0};
        ERR_error_string_n(ERR_get_error(), msg_buf, sizeof(msg_buf));
        ERR_clear_error();
        obj->clear();
        delete obj;
        return Nan::ThrowError(msg_buf);
      }
      obj->clear();
      delete obj;
      switch (r) {
        case kErrBadKeyLen:
          return Nan::ThrowError("Invalid keys length");
        case kErrBadIVLen:
          return Nan::ThrowError("Invalid IV length");
        case kErrBadCipherName:
          return Nan::ThrowError("Invalid AES GCM cipher name");
        default:
          return Nan::ThrowError("Unknown init failure");
      }
    }

    obj->Wrap(info.This());
    info.GetReturnValue().Set(info.This());
  }

  static NAN_METHOD(Encrypt) {
    MarkPopErrorOnReturn mark_pop_error_on_return;

    AESGCMCipher* obj = ObjectWrap::Unwrap<AESGCMCipher>(info.Holder());

    if (!Buffer::HasInstance(info[0]))
      return Nan::ThrowTypeError("Missing/Invalid packet");

    ErrorType r = obj->encrypt(
      reinterpret_cast<unsigned char*>(Buffer::Data(info[0])),
      Buffer::Length(info[0])
    );
    switch (r) {
      case kErrNone:
        return;
      case kErrAADFailure:
        return Nan::ThrowError("Error setting AAD");
      case kErrPartialEncrypt:
        return Nan::ThrowError("Failed to completely encrypt packet");
      case kErrTagFailure:
        return Nan::ThrowError("Error generating authentication tag");
      case kErrOpenSSL: {
        char msg_buf[128] = {0};
        ERR_error_string_n(ERR_get_error(), msg_buf, sizeof(msg_buf));
        ERR_clear_error();
        return Nan::ThrowError(msg_buf);
      }
      default:
        return Nan::ThrowError("Unknown encrypt failure");
    }
  }

  static NAN_METHOD(Free) {
    AESGCMCipher* obj = ObjectWrap::Unwrap<AESGCMCipher>(info.Holder());
    obj->clear();
  }

  static inline v8::Eternal<v8::Function> & constructor() {
    static v8::Eternal<v8::Function> my_constructor;
    return my_constructor;
  }

  EVP_CIPHER_CTX* ctx_;
};

class GenericCipher : public ObjectWrap {
 public:
  static NAN_MODULE_INIT(Init) {
    Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(New);
    tpl->SetClassName(Nan::New("GenericCipher").ToLocalChecked());
    tpl->InstanceTemplate()->SetInternalFieldCount(1);

    SetPrototypeMethod(tpl, "encrypt", Encrypt);
    SetPrototypeMethod(tpl, "free", Free);

    Local<Function> func = Nan::GetFunction(tpl).ToLocalChecked();
    Local<Context> context = Nan::GetCurrentContext();
    v8::Isolate* isolate = context->GetIsolate();

    constructor().Set(isolate, func);

    Nan::Set(target,
             Nan::New("GenericCipher").ToLocalChecked(),
             func);
  }

 private:
  explicit GenericCipher()
    : ctx_(nullptr),
#if REAL_OPENSSL_MAJOR >= 3
      mac_(nullptr),
      mac_ctx_base_(nullptr),
#else
      ctx_hmac_(nullptr),
#endif
      hmac_len_(0),
      is_etm_(0) {}

  ~GenericCipher() {
    clear();
  }

  void clear() {
    if (ctx_) {
      EVP_CIPHER_CTX_free(ctx_);
      ctx_ = nullptr;
    }
#if REAL_OPENSSL_MAJOR >= 3
    if (mac_ctx_base_) {
      EVP_MAC_CTX_free(mac_ctx_base_);
      mac_ctx_base_ = nullptr;
    }
    if (mac_) {
      EVP_MAC_free(mac_);
      mac_ = nullptr;
    }
#else
    if (ctx_hmac_) {
      HMAC_CTX_free(ctx_hmac_);
      ctx_hmac_ = nullptr;
    }
#endif
  }

  ErrorType init(const char* name,
                 unsigned char* key,
                 size_t key_len,
                 unsigned char* iv,
                 size_t iv_len,
                 const char* hmac_name,
                 unsigned char* hmac_key,
                 size_t hmac_key_len,
                 int is_etm) {
    ErrorType r = kErrNone;

#if REAL_OPENSSL_MAJOR >= 3
    OSSL_PARAM params[2];
#else
    const EVP_MD* md;
#endif
    const EVP_CIPHER* const cipher = EVP_get_cipherbyname(name);
    if (cipher == nullptr) {
      r = kErrOpenSSL;
      goto out;
    }

    if ((ctx_ = EVP_CIPHER_CTX_new()) == nullptr
        || EVP_EncryptInit_ex(ctx_, cipher, nullptr, nullptr, nullptr) != 1) {
      r = kErrOpenSSL;
      goto out;
    }

    if (iv_len != static_cast<size_t>(ctx_iv_len(ctx_))) {
      r = kErrBadIVLen;
      goto out;
    }

    if (key_len != static_cast<size_t>(ctx_key_len(ctx_))) {
      if (!EVP_CIPHER_CTX_set_key_length(ctx_, key_len)) {
        r = kErrBadKeyLen;
        goto out;
      }
    }

    // Set key and IV
    if (EVP_EncryptInit_ex(ctx_, nullptr, nullptr, key, iv) != 1) {
      r = kErrOpenSSL;
      goto out;
    }

    // Disable padding
    EVP_CIPHER_CTX_set_padding(ctx_, 0);

    if (cipher == EVP_rc4()) {
      /* The "arcfour128" algorithm is the RC4 cipher, as described in
         [SCHNEIER], using a 128-bit key.  The first 1536 bytes of keystream
         generated by the cipher MUST be discarded, and the first byte of the
         first encrypted packet MUST be encrypted using the 1537th byte of
         keystream.

         -- http://tools.ietf.org/html/rfc4345#section-4 */
      unsigned char zeros[1536] = {0};
      int outlen = sizeof(zeros);
      if (EVP_EncryptUpdate(ctx_,
                            zeros,
                            &outlen,
                            zeros,
                            sizeof(zeros)) != 1) {
        r = kErrOpenSSL;
        goto out;
      }
      if (static_cast<size_t>(outlen) != sizeof(zeros)) {
        r = kErrBadInit;
        goto out;
      }
    }

#if REAL_OPENSSL_MAJOR >= 3
    if ((mac_ = EVP_MAC_fetch(nullptr,
                              "HMAC",
                              "provider=default")) == nullptr) {
      r = kErrOpenSSL;
      goto out;
    }
    if ((mac_ctx_base_ = EVP_MAC_CTX_new(mac_)) == nullptr) {
      r = kErrOpenSSL;
      goto out;
    }
    params[0] = OSSL_PARAM_construct_utf8_string("digest",
                                                 const_cast<char*>(hmac_name),
                                                 0);
    params[1] = OSSL_PARAM_END;
    if (EVP_MAC_init(mac_ctx_base_, hmac_key, hmac_key_len, params) != 1) {
      EVP_MAC_CTX_free(mac_ctx_base_);
      r = kErrOpenSSL;
      goto out;
    }
    hmac_len_ = EVP_MAC_CTX_get_mac_size(mac_ctx_base_);
#else
    md = EVP_get_digestbyname(hmac_name);
    if (md == nullptr) {
      r = kErrBadHMACName;
      goto out;
    }

    if ((ctx_hmac_ = HMAC_CTX_new()) == nullptr
        || HMAC_Init_ex(ctx_hmac_, hmac_key, hmac_key_len, md, nullptr) != 1) {
      r = kErrOpenSSL;
      goto out;
    }

    hmac_len_ = HMAC_size(ctx_hmac_);
#endif
    is_etm_ = is_etm;

out:
    return r;
  }

  ErrorType encrypt(unsigned char* packet,
                    uint32_t packet_len,
                    uint32_t seqno) {
    ErrorType r = kErrNone;

    // `packet` layout:
    //   <packet length> <padding length> <payload> <padding> <mac>
    uint32_t data_len = packet_len - hmac_len_;

    int outlen;

    uint8_t seqbuf[4] = {0};
    ((uint8_t*)(seqbuf))[0] = (seqno >> 24) & 0xff;
    ((uint8_t*)(seqbuf))[1] = (seqno >> 16) & 0xff;
    ((uint8_t*)(seqbuf))[2] = (seqno >> 8) & 0xff;
    ((uint8_t*)(seqbuf))[3] = seqno & 0xff;

    if (is_etm_) {
      // Encrypt everything but packet length
      if (EVP_EncryptUpdate(ctx_,
                            packet + 4,
                            &outlen,
                            packet + 4,
                            data_len - 4) != 1) {
        r = kErrOpenSSL;
        goto out;
      }
      if (static_cast<size_t>(outlen) != data_len - 4) {
        r = kErrPartialEncrypt;
        goto out;
      }
    }

    // Calculate HMAC
    {
#if REAL_OPENSSL_MAJOR >= 3
      size_t outlen = hmac_len_;

      EVP_MAC_CTX* mac_ctx = EVP_MAC_CTX_dup(mac_ctx_base_);
      if (mac_ctx == nullptr) {
        r = kErrOpenSSL;
        goto out;
      }
      if (EVP_MAC_update(mac_ctx, seqbuf, sizeof(seqbuf)) != 1
          || EVP_MAC_update(mac_ctx, packet, data_len) != 1
          || EVP_MAC_final(mac_ctx,
                           packet + data_len,
                           reinterpret_cast<size_t*>(&outlen),
                           outlen) != 1) {
        EVP_MAC_CTX_free(mac_ctx);
        r = kErrOpenSSL;
        goto out;
      }
      if (outlen != hmac_len_) {
        EVP_MAC_CTX_free(mac_ctx);
        r = kErrBadHMACLen;
        goto out;
      }
      EVP_MAC_CTX_free(mac_ctx);
#else
      unsigned int outlen = hmac_len_;
      if (HMAC_Init_ex(ctx_hmac_, nullptr, 0, nullptr, nullptr) != 1
          || HMAC_Update(ctx_hmac_, seqbuf, sizeof(seqbuf)) != 1
          || HMAC_Update(ctx_hmac_, packet, data_len) != 1
          || HMAC_Final(ctx_hmac_, packet + data_len, &outlen) != 1) {
        r = kErrOpenSSL;
        goto out;
      }
      if (outlen != hmac_len_) {
        r = kErrBadHMACLen;
        goto out;
      }
#endif
    }

    if (!is_etm_) {
      // Encrypt packet
      if (EVP_EncryptUpdate(ctx_,
                            packet,
                            &outlen,
                            packet,
                            data_len) != 1) {
        r = kErrOpenSSL;
        goto out;
      }
      if (static_cast<size_t>(outlen) != data_len) {
        
        r = kErrPartialEncrypt;
        goto out;
      }
    }

out:
    return r;
  }

  static NAN_METHOD(New) {
    MarkPopErrorOnReturn mark_pop_error_on_return;

    if (!info[0]->IsString())
      return Nan::ThrowTypeError("Missing/Invalid cipher name");

    if (!Buffer::HasInstance(info[1]))
      return Nan::ThrowTypeError("Missing/Invalid cipher key");

    if (!Buffer::HasInstance(info[2]))
      return Nan::ThrowTypeError("Missing/Invalid cipher IV");

    if (!info[3]->IsString())
      return Nan::ThrowTypeError("Missing/Invalid HMAC name");

    if (!Buffer::HasInstance(info[4]))
      return Nan::ThrowTypeError("Missing/Invalid HMAC key");

    if (!info[5]->IsBoolean())
      return Nan::ThrowTypeError("Missing/Invalid HMAC ETM flag");

    const Nan::Utf8String cipher_name(info[0]);
    const Nan::Utf8String mac_name(info[3]);
    int is_etm = (Nan::To<bool>(info[5]).FromJust() ? 1 : 0);

    GenericCipher* obj = new GenericCipher();
    ErrorType r = obj->init(
      *cipher_name,
      reinterpret_cast<unsigned char*>(Buffer::Data(info[1])),
      Buffer::Length(info[1]),
      reinterpret_cast<unsigned char*>(Buffer::Data(info[2])),
      Buffer::Length(info[2]),
      *mac_name,
      reinterpret_cast<unsigned char*>(Buffer::Data(info[4])),
      Buffer::Length(info[4]),
      is_etm
    );
    if (r != kErrNone) {
      if (r == kErrOpenSSL) {
        char msg_buf[128] = {0};
        ERR_error_string_n(ERR_get_error(), msg_buf, sizeof(msg_buf));
        ERR_clear_error();
        obj->clear();
        delete obj;
        return Nan::ThrowError(msg_buf);
      }
      obj->clear();
      delete obj;
      switch (r) {
        case kErrBadKeyLen:
          return Nan::ThrowError("Invalid keys length");
        case kErrBadIVLen:
          return Nan::ThrowError("Invalid IV length");
        case kErrBadCipherName:
          return Nan::ThrowError("Invalid cipher name");
        case kErrBadHMACName:
          return Nan::ThrowError("Invalid MAC name");
        case kErrBadInit:
          return Nan::ThrowError("Failed to properly initialize cipher");
        default:
          return Nan::ThrowError("Unknown init failure");
      }
    }

    obj->Wrap(info.This());
    info.GetReturnValue().Set(info.This());
  }

  static NAN_METHOD(Encrypt) {
    MarkPopErrorOnReturn mark_pop_error_on_return;

    GenericCipher* obj = ObjectWrap::Unwrap<GenericCipher>(info.Holder());

    if (!Buffer::HasInstance(info[0]))
      return Nan::ThrowTypeError("Missing/Invalid packet");

    if (!info[1]->IsUint32())
      return Nan::ThrowTypeError("Missing/Invalid sequence number");

    ErrorType r = obj->encrypt(
      reinterpret_cast<unsigned char*>(Buffer::Data(info[0])),
      Buffer::Length(info[0]),
      Nan::To<uint32_t>(info[1]).FromJust()
    );
    switch (r) {
      case kErrNone:
        return;
      case kErrPartialEncrypt:
        return Nan::ThrowError("Failed to completely encrypt packet");
      case kErrBadHMACLen:
        return Nan::ThrowError("Unexpected HMAC length");
      case kErrOpenSSL: {
        char msg_buf[128] = {0};
        ERR_error_string_n(ERR_get_error(), msg_buf, sizeof(msg_buf));
        ERR_clear_error();
        return Nan::ThrowError(msg_buf);
      }
      default:
        return Nan::ThrowError("Unknown encrypt failure");
    }
  }

  static NAN_METHOD(Free) {
    GenericCipher* obj = ObjectWrap::Unwrap<GenericCipher>(info.Holder());
    obj->clear();
  }

  static inline v8::Eternal<v8::Function> & constructor() {
    static v8::Eternal<v8::Function> my_constructor;
    return my_constructor;
  }

  EVP_CIPHER_CTX* ctx_;
#if REAL_OPENSSL_MAJOR >= 3
  EVP_MAC* mac_;
  EVP_MAC_CTX* mac_ctx_base_;
  size_t hmac_len_;
#else
  HMAC_CTX* ctx_hmac_;
  unsigned int hmac_len_;
#endif
  int is_etm_;
};

// =============================================================================

class ChaChaPolyDecipher : public ObjectWrap {
 public:
  static NAN_MODULE_INIT(Init) {
    Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(New);
    tpl->SetClassName(Nan::New("ChaChaPolyDecipher").ToLocalChecked());
    tpl->InstanceTemplate()->SetInternalFieldCount(1);

    SetPrototypeMethod(tpl, "decrypt", Decrypt);
    SetPrototypeMethod(tpl, "decryptLen", DecryptLen);
    SetPrototypeMethod(tpl, "free", Free);

    Local<Function> func = Nan::GetFunction(tpl).ToLocalChecked();
    Local<Context> context = Nan::GetCurrentContext();
    v8::Isolate* isolate = context->GetIsolate();

    constructor().Set(isolate, func);

    Nan::Set(target,
             Nan::New("ChaChaPolyDecipher").ToLocalChecked(),
             func);
  }

 private:
  explicit ChaChaPolyDecipher()
    : ctx_main_(nullptr),
      ctx_pktlen_(nullptr),
#if REAL_OPENSSL_MAJOR >= 3
      mac_(nullptr),
      mac_ctx_(nullptr) {}
#else
      md_ctx_(nullptr),
      polykey_(nullptr),
      polykey_ctx_(nullptr) {}
#endif

  ~ChaChaPolyDecipher() {
    clear();
  }

  void clear() {
    if (ctx_pktlen_) {
      EVP_CIPHER_CTX_free(ctx_pktlen_);
      ctx_pktlen_ = nullptr;
    }
    if (ctx_main_) {
      EVP_CIPHER_CTX_free(ctx_main_);
      ctx_main_ = nullptr;
    }
#if REAL_OPENSSL_MAJOR >= 3
    if (mac_ctx_) {
      EVP_MAC_CTX_free(mac_ctx_);
      mac_ctx_ = nullptr;
    }
    if (mac_) {
      EVP_MAC_free(mac_);
      mac_ = nullptr;
    }
#else
    if (polykey_) {
      EVP_PKEY_free(polykey_);
      polykey_ = nullptr;
    }
    if (md_ctx_) {
      EVP_MD_CTX_free(md_ctx_);
      md_ctx_ = nullptr;
    }
    // `polykey_ctx_` is not explicitly freed as it is freed implicitly when
    // `md_ctx_` is freed
#endif
  }

  ErrorType init(unsigned char* keys, size_t keys_len) {
    ErrorType r = kErrNone;
    const EVP_CIPHER* const cipher = EVP_get_cipherbyname("chacha20");

    if (keys_len != 64) {
      r = kErrBadKeyLen;
      goto out;
    }

    if (cipher == nullptr) {
      r = kErrOpenSSL;
      goto out;
    }

    if ((ctx_pktlen_ = EVP_CIPHER_CTX_new()) == nullptr
        || (ctx_main_ = EVP_CIPHER_CTX_new()) == nullptr
#if REAL_OPENSSL_MAJOR >= 3
        || (mac_ = EVP_MAC_fetch(nullptr,
                                 "POLY1305",
                                 "provider=default")) == nullptr
        || (mac_ctx_ = EVP_MAC_CTX_new(mac_)) == nullptr
#else
        || (md_ctx_ = EVP_MD_CTX_new()) == nullptr
#endif
        || EVP_DecryptInit_ex(ctx_pktlen_,
                              cipher,
                              nullptr,
                              keys + 32,
                              nullptr) != 1
        || EVP_DecryptInit_ex(ctx_main_,
                              cipher,
                              nullptr,
                              keys,
                              nullptr) != 1) {
      r = kErrOpenSSL;
      goto out;
    }
    if (ctx_iv_len(ctx_pktlen_) != 16) {
      r = kErrBadIVLen;
      goto out;
    }

out:
    return r;
  }

  ErrorType decrypt_length(unsigned char* data,
                           size_t data_len,
                           uint32_t seqno,
                           uint32_t* packet_length) {
    ErrorType r = kErrNone;
    int outlen;

    unsigned char dec_length_bytes[4];

    uint8_t seqbuf[16] = {0};
    ((uint8_t*)(seqbuf))[12] = (seqno >> 24) & 0xff;
    ((uint8_t*)(seqbuf))[13] = (seqno >> 16) & 0xff;
    ((uint8_t*)(seqbuf))[14] = (seqno >> 8) & 0xff;
    ((uint8_t*)(seqbuf))[15] = seqno & 0xff;

    if (EVP_DecryptInit_ex(ctx_pktlen_,
                           nullptr,
                           nullptr,
                           nullptr,
                           seqbuf) != 1) {
      r = kErrOpenSSL;
      goto out;
    }
    if (EVP_DecryptUpdate(ctx_pktlen_,
                          dec_length_bytes,
                          &outlen,
                          data,
                          data_len) != 1) {
      r = kErrOpenSSL;
      goto out;
    }
    if (static_cast<size_t>(outlen) != 4) {
      r = kErrPartialDecrypt;
      goto out;
    }

    *packet_length = (uint32_t)dec_length_bytes[0] << 24
                     | (uint32_t)dec_length_bytes[1] << 16
                     | (uint32_t)dec_length_bytes[2] << 8
                     | (uint32_t)dec_length_bytes[3];
    memcpy(length_bytes, data, data_len);
out:
    return r;
  }

  ErrorType decrypt(unsigned char* packet,
                    uint32_t packet_len,
                    unsigned char* mac,
                    uint32_t seqno) {
    ErrorType r = kErrNone;
    size_t sig_len = 16;
    int outlen = 0;

    // `packet` layout:
    //   <padding length> <payload> <padding>

    unsigned char polykey[POLY1305_KEYLEN] = {0};
    unsigned char calc_mac[POLY1305_TAGLEN] = {0};

    uint8_t seqbuf[16] = {0};
    ((uint8_t*)(seqbuf))[12] = (seqno >> 24) & 0xff;
    ((uint8_t*)(seqbuf))[13] = (seqno >> 16) & 0xff;
    ((uint8_t*)(seqbuf))[14] = (seqno >> 8) & 0xff;
    ((uint8_t*)(seqbuf))[15] = seqno & 0xff;

    // Generate Poly1305 key
    if (EVP_EncryptInit_ex(ctx_main_, nullptr, nullptr, nullptr, seqbuf) != 1) {
      r = kErrOpenSSL;
      goto out;
    }
    if (EVP_EncryptUpdate(ctx_main_,
                          polykey,
                          &outlen,
                          polykey,
                          sizeof(polykey)) != 1) {
      r = kErrOpenSSL;
      goto out;
    }
    if (static_cast<size_t>(outlen) != sizeof(polykey)) {
      r = kErrPartialEncrypt;
      goto out;
    }

    // Poly1305 over ciphertext
#if REAL_OPENSSL_MAJOR >= 3
    // TODO: check if dup()'ing a "base" context instead of calling init() with
    //       the key each time is faster
    if (EVP_MAC_init(mac_ctx_, polykey, sizeof(polykey), nullptr) != 1
        || EVP_MAC_update(mac_ctx_, length_bytes, sizeof(length_bytes)) != 1
        || EVP_MAC_update(mac_ctx_, packet, packet_len) != 1
        || EVP_MAC_final(mac_ctx_, calc_mac, &sig_len, sig_len) != 1) {
      r = kErrOpenSSL;
      goto out;
    }
#else
    if (polykey_) {
      if (EVP_PKEY_CTX_ctrl(polykey_ctx_,
                            -1,
                            EVP_PKEY_OP_SIGNCTX,
                            EVP_PKEY_CTRL_SET_MAC_KEY,
                            sizeof(polykey),
                            (void*)polykey) <= 0) {
        r = kErrOpenSSL;
        goto out;
      }
    } else {
      polykey_ = EVP_PKEY_new_raw_private_key(EVP_PKEY_POLY1305,
                                              nullptr,
                                              polykey,
                                              sizeof(polykey));
      if (polykey_ == nullptr) {
        r = kErrOpenSSL;
        goto out;
      }

      if (!EVP_DigestSignInit(md_ctx_,
                              &polykey_ctx_,
                              nullptr,
                              nullptr,
                              polykey_)) {
        r = kErrOpenSSL;
        goto out;
      }
    }
    if (EVP_DigestSignUpdate(md_ctx_,
                             length_bytes,
                             sizeof(length_bytes)) != 1) {
      r = kErrOpenSSL;
      goto out;
    }
    if (EVP_DigestSignUpdate(md_ctx_, packet, packet_len) != 1) {
      r = kErrOpenSSL;
      goto out;
    }

    // Generate Poly1305 MAC
    if (EVP_DigestSignFinal(md_ctx_, calc_mac, &sig_len) != 1) {
      r = kErrOpenSSL;
      goto out;
    }
#endif

    // Compare MACs
    if (CRYPTO_memcmp(mac, calc_mac, sizeof(calc_mac))) {
      r = kErrInvalidMAC;
      goto out;
    }

    // Decrypt packet
    seqbuf[0] = 1;
    if (EVP_DecryptInit_ex(ctx_main_, nullptr, nullptr, nullptr, seqbuf) != 1) {
      r = kErrOpenSSL;
      goto out;
    }
    if (EVP_DecryptUpdate(ctx_main_,
                          packet,
                          &outlen,
                          packet,
                          packet_len) != 1) {
      r = kErrOpenSSL;
      goto out;
    }
    if (static_cast<size_t>(outlen) != packet_len) {
      r = kErrPartialDecrypt;
      goto out;
    }

  out:
    return r;
  }

  static NAN_METHOD(New) {
    MarkPopErrorOnReturn mark_pop_error_on_return;

    if (!Buffer::HasInstance(info[0]))
      return Nan::ThrowTypeError("Missing/Invalid keys");

    ChaChaPolyDecipher* obj = new ChaChaPolyDecipher();
    ErrorType r = obj->init(
      reinterpret_cast<unsigned char*>(Buffer::Data(info[0])),
      Buffer::Length(info[0])
    );
    if (r != kErrNone) {
      if (r == kErrOpenSSL) {
        char msg_buf[128] = {0};
        ERR_error_string_n(ERR_get_error(), msg_buf, sizeof(msg_buf));
        ERR_clear_error();
        obj->clear();
        delete obj;
        return Nan::ThrowError(msg_buf);
      }
      obj->clear();
      delete obj;
      switch (r) {
        case kErrBadKeyLen:
          return Nan::ThrowError("Invalid keys length");
        case kErrBadIVLen:
          return Nan::ThrowError("Invalid IV length");
        default:
          return Nan::ThrowError("Unknown init failure");
      }
    }

    obj->Wrap(info.This());
    info.GetReturnValue().Set(info.This());
  }

  static NAN_METHOD(DecryptLen) {
    MarkPopErrorOnReturn mark_pop_error_on_return;

    ChaChaPolyDecipher* obj =
      ObjectWrap::Unwrap<ChaChaPolyDecipher>(info.Holder());

    if (!Buffer::HasInstance(info[0]) || Buffer::Length(info[0]) != 4)
      return Nan::ThrowTypeError("Missing/Invalid length bytes");

    if (!info[1]->IsUint32())
      return Nan::ThrowTypeError("Missing/Invalid sequence number");

    unsigned char* length_bytes =
      reinterpret_cast<unsigned char*>(Buffer::Data(info[0]));

    uint32_t dec_packet_length;
    ErrorType r = obj->decrypt_length(
      length_bytes,
      Buffer::Length(info[0]),
      Nan::To<uint32_t>(info[1]).FromJust(),
      &dec_packet_length
    );

    switch (r) {
      case kErrNone:
        return info.GetReturnValue().Set(dec_packet_length);
      case kErrPartialDecrypt:
        return Nan::ThrowError("Failed to completely decrypt packet length");
      case kErrOpenSSL: {
        char msg_buf[128] = {0};
        ERR_error_string_n(ERR_get_error(), msg_buf, sizeof(msg_buf));
        ERR_clear_error();
        return Nan::ThrowError(msg_buf);
      }
      default:
        return Nan::ThrowError("Unknown decrypt failure");
    }
  }

  static NAN_METHOD(Decrypt) {
    MarkPopErrorOnReturn mark_pop_error_on_return;

    ChaChaPolyDecipher* obj =
      ObjectWrap::Unwrap<ChaChaPolyDecipher>(info.Holder());

    if (!Buffer::HasInstance(info[0]))
      return Nan::ThrowTypeError("Missing/Invalid packet");

    if (!Buffer::HasInstance(info[1])
        || Buffer::Length(info[1]) != POLY1305_TAGLEN) {
      return Nan::ThrowTypeError("Missing/Invalid mac");
    }

    if (!info[2]->IsUint32())
      return Nan::ThrowTypeError("Missing/Invalid sequence number");

    ErrorType r = obj->decrypt(
      reinterpret_cast<unsigned char*>(Buffer::Data(info[0])),
      Buffer::Length(info[0]),
      reinterpret_cast<unsigned char*>(Buffer::Data(info[1])),
      Nan::To<uint32_t>(info[2]).FromJust()
    );

    switch (r) {
      case kErrNone:
        return;
      case kErrInvalidMAC:
        return Nan::ThrowError("Invalid MAC");
      case kErrPartialDecrypt:
        return Nan::ThrowError("Failed to completely decrypt packet length");
      case kErrOpenSSL: {
        char msg_buf[128] = {0};
        ERR_error_string_n(ERR_get_error(), msg_buf, sizeof(msg_buf));
        ERR_clear_error();
        return Nan::ThrowError(msg_buf);
      }
      default:
        return Nan::ThrowError("Unknown decrypt failure");
    }
  }

  static NAN_METHOD(Free) {
    ChaChaPolyDecipher* obj =
      ObjectWrap::Unwrap<ChaChaPolyDecipher>(info.Holder());
    obj->clear();
  }

  static inline v8::Eternal<v8::Function> & constructor() {
    static v8::Eternal<v8::Function> my_constructor;
    return my_constructor;
  }

  unsigned char length_bytes[4];
  EVP_CIPHER_CTX* ctx_main_;
  EVP_CIPHER_CTX* ctx_pktlen_;
#if REAL_OPENSSL_MAJOR >= 3
  EVP_MAC* mac_;
  EVP_MAC_CTX* mac_ctx_;
#else
  EVP_MD_CTX* md_ctx_;
  EVP_PKEY* polykey_;
  EVP_PKEY_CTX* polykey_ctx_;
#endif
};

class AESGCMDecipher : public ObjectWrap {
 public:
  static NAN_MODULE_INIT(Init) {
    Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(New);
    tpl->SetClassName(Nan::New("AESGCMDecipher").ToLocalChecked());
    tpl->InstanceTemplate()->SetInternalFieldCount(1);

    SetPrototypeMethod(tpl, "decrypt", Decrypt);
    SetPrototypeMethod(tpl, "free", Free);

    Local<Function> func = Nan::GetFunction(tpl).ToLocalChecked();
    Local<Context> context = Nan::GetCurrentContext();
    v8::Isolate* isolate = context->GetIsolate();

    constructor().Set(isolate, func);

    Nan::Set(target,
             Nan::New("AESGCMDecipher").ToLocalChecked(),
             func);
  }

 private:
  explicit AESGCMDecipher() : ctx_(nullptr) {}

  ~AESGCMDecipher() {
    clear();
  }

  void clear() {
    if (ctx_) {
      EVP_CIPHER_CTX_free(ctx_);
      ctx_ = nullptr;
    }
  }

  ErrorType init(const char* name,
                 unsigned char* key,
                 size_t key_len,
                 unsigned char* iv,
                 size_t iv_len) {
    ErrorType r = kErrNone;

    const EVP_CIPHER* const cipher = EVP_get_cipherbyname(name);
    if (cipher == nullptr) {
      r = kErrOpenSSL;
      goto out;
    }

    if (cipher != EVP_aes_128_gcm() && cipher != EVP_aes_256_gcm()) {
      r = kErrBadCipherName;
      goto out;
    }

    if ((ctx_ = EVP_CIPHER_CTX_new()) == nullptr
        || EVP_DecryptInit_ex(ctx_, cipher, nullptr, nullptr, nullptr) != 1) {
      r = kErrOpenSSL;
      goto out;
    }

    if (!EVP_CIPHER_CTX_ctrl(ctx_, EVP_CTRL_AEAD_SET_IVLEN, iv_len, nullptr)) {
      r = kErrOpenSSL;
      goto out;
    }

    if (key_len != static_cast<size_t>(ctx_key_len(ctx_))) {
      if (!EVP_CIPHER_CTX_set_key_length(ctx_, key_len)) {
        r = kErrBadKeyLen;
        goto out;
      }
    }

    // Set key and IV
    if (EVP_DecryptInit_ex(ctx_, nullptr, nullptr, key, iv) != 1) {
      r = kErrOpenSSL;
      goto out;
    }
    if (!EVP_CIPHER_CTX_ctrl(ctx_, EVP_CTRL_GCM_SET_IV_FIXED, -1, iv)) {
      r = kErrOpenSSL;
      goto out;
    }

    // Disable padding
    EVP_CIPHER_CTX_set_padding(ctx_, 0);

out:
    return r;
  }

  ErrorType decrypt(unsigned char* packet,
                    uint32_t packet_len,
                    unsigned char* length_bytes,
                    unsigned char* tag) {
    ErrorType r = kErrNone;

    // `packet` layout:
    //   <padding length> <payload> <padding>

    int outlen;

    // Increment IV
    unsigned char lastiv[1];
    if (!EVP_CIPHER_CTX_ctrl(ctx_, EVP_CTRL_GCM_IV_GEN, 1, lastiv)) {
      r = kErrOpenSSL;
      goto out;
    }

    // Set AAD (the packet length)
    if (!EVP_DecryptUpdate(ctx_, nullptr, &outlen, length_bytes, 4)) {
      r = kErrOpenSSL;
      goto out;
    }
    if (outlen != 4) {
      r = kErrAADFailure;
      goto out;
    }

    // Decrypt everything but the packet length
    if (EVP_DecryptUpdate(ctx_, packet, &outlen, packet, packet_len) != 1) {
      r = kErrOpenSSL;
      goto out;
    }
    if (static_cast<size_t>(outlen) != packet_len) {
      r = kErrPartialDecrypt;
      goto out;
    }

    // Set authentication tag
    if (EVP_CIPHER_CTX_ctrl(ctx_, EVP_CTRL_AEAD_SET_TAG, 16, tag) != 1) {
      r = kErrOpenSSL;
      goto out;
    }

    // Verify authentication tag
    if (!EVP_DecryptFinal_ex(ctx_, nullptr, &outlen)) {
      r = kErrOpenSSL;
      goto out;
    }

out:
    return r;
  }

  static NAN_METHOD(New) {
    MarkPopErrorOnReturn mark_pop_error_on_return;

    if (!info[0]->IsString())
      return Nan::ThrowTypeError("Missing/Invalid OpenSSL cipher name");

    if (!Buffer::HasInstance(info[1]))
      return Nan::ThrowTypeError("Missing/Invalid key");

    if (!Buffer::HasInstance(info[2]))
      return Nan::ThrowTypeError("Missing/Invalid iv");

    const Nan::Utf8String cipher_name(info[0]);

    AESGCMDecipher* obj = new AESGCMDecipher();
    ErrorType r = obj->init(
      *cipher_name,
      reinterpret_cast<unsigned char*>(Buffer::Data(info[1])),
      Buffer::Length(info[1]),
      reinterpret_cast<unsigned char*>(Buffer::Data(info[2])),
      Buffer::Length(info[2])
    );
    if (r != kErrNone) {
      if (r == kErrOpenSSL) {
        char msg_buf[128] = {0};
        ERR_error_string_n(ERR_get_error(), msg_buf, sizeof(msg_buf));
        ERR_clear_error();
        obj->clear();
        delete obj;
        return Nan::ThrowError(msg_buf);
      }
      obj->clear();
      delete obj;
      switch (r) {
        case kErrBadKeyLen:
          return Nan::ThrowError("Invalid keys length");
        case kErrBadIVLen:
          return Nan::ThrowError("Invalid IV length");
        case kErrBadCipherName:
          return Nan::ThrowError("Invalid AES GCM cipher name");
        default:
          return Nan::ThrowError("Unknown init failure");
      }
    }

    obj->Wrap(info.This());
    info.GetReturnValue().Set(info.This());
  }

  static NAN_METHOD(Decrypt) {
    MarkPopErrorOnReturn mark_pop_error_on_return;

    AESGCMDecipher* obj = ObjectWrap::Unwrap<AESGCMDecipher>(info.Holder());

    if (!Buffer::HasInstance(info[0]))
      return Nan::ThrowTypeError("Missing/Invalid packet");

    if (!info[1]->IsUint32())
      return Nan::ThrowTypeError("Missing/Invalid length");

    if (!Buffer::HasInstance(info[2]) || Buffer::Length(info[2]) != 16)
      return Nan::ThrowTypeError("Missing/Invalid tag");

    uint32_t length = Nan::To<uint32_t>(info[1]).FromJust();
    unsigned char length_bytes[4];
    length_bytes[0] = (length >> 24) & 0xFF;
    length_bytes[1] = (length >> 16) & 0xFF;
    length_bytes[2] = (length >> 8) & 0xFF;
    length_bytes[3] = length & 0xFF;

    ErrorType r = obj->decrypt(
      reinterpret_cast<unsigned char*>(Buffer::Data(info[0])),
      Buffer::Length(info[0]),
      length_bytes,
      reinterpret_cast<unsigned char*>(Buffer::Data(info[2]))
    );
    switch (r) {
      case kErrNone:
        return;
      case kErrAADFailure:
        return Nan::ThrowError("Error setting AAD");
      case kErrPartialDecrypt:
        return Nan::ThrowError("Failed to completely decrypt packet");
      case kErrTagFailure:
        return Nan::ThrowError("Error generating authentication tag");
      case kErrOpenSSL: {
        char msg_buf[128] = {0};
        ERR_error_string_n(ERR_get_error(), msg_buf, sizeof(msg_buf));
        ERR_clear_error();
        return Nan::ThrowError(msg_buf);
      }
      default:
        return Nan::ThrowError("Unknown decrypt failure");
    }
  }

  static NAN_METHOD(Free) {
    AESGCMDecipher* obj = ObjectWrap::Unwrap<AESGCMDecipher>(info.Holder());
    obj->clear();
  }

  static inline v8::Eternal<v8::Function> & constructor() {
    static v8::Eternal<v8::Function> my_constructor;
    return my_constructor;
  }

  EVP_CIPHER_CTX* ctx_;
};

class GenericDecipher : public ObjectWrap {
 public:
  static NAN_MODULE_INIT(Init) {
    Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(New);
    tpl->SetClassName(Nan::New("GenericDecipher").ToLocalChecked());
    tpl->InstanceTemplate()->SetInternalFieldCount(1);

    SetPrototypeMethod(tpl, "decryptBlock", DecryptBlock);
    SetPrototypeMethod(tpl, "decrypt", Decrypt);
    SetPrototypeMethod(tpl, "free", Free);

    Local<Function> func = Nan::GetFunction(tpl).ToLocalChecked();
    Local<Context> context = Nan::GetCurrentContext();
    v8::Isolate* isolate = context->GetIsolate();

    constructor().Set(isolate, func);

    Nan::Set(target,
             Nan::New("GenericDecipher").ToLocalChecked(),
             func);
  }

 private:
  explicit GenericDecipher()
    : ctx_(nullptr),
#if REAL_OPENSSL_MAJOR >= 3
      mac_(nullptr),
      mac_ctx_base_(nullptr),
#else
      ctx_hmac_(nullptr),
#endif
      hmac_len_(0),
      is_etm_(0) {}

  ~GenericDecipher() {
    clear();
  }

  void clear() {
    if (ctx_) {
      EVP_CIPHER_CTX_free(ctx_);
      ctx_ = nullptr;
    }
#if REAL_OPENSSL_MAJOR >= 3
    if (mac_ctx_base_) {
      EVP_MAC_CTX_free(mac_ctx_base_);
      mac_ctx_base_ = nullptr;
    }
    if (mac_) {
      EVP_MAC_free(mac_);
      mac_ = nullptr;
    }
#else
    if (ctx_hmac_) {
      HMAC_CTX_free(ctx_hmac_);
      ctx_hmac_ = nullptr;
    }
#endif
  }

  ErrorType init(const char* name,
                 unsigned char* key,
                 size_t key_len,
                 unsigned char* iv,
                 size_t iv_len,
                 const char* hmac_name,
                 unsigned char* hmac_key,
                 size_t hmac_key_len,
                 int is_etm,
                 size_t hmac_actual_len) {
    ErrorType r = kErrNone;

#if REAL_OPENSSL_MAJOR >= 3
    OSSL_PARAM params[2];
#else
    const EVP_MD* md;
#endif
    const EVP_CIPHER* const cipher = EVP_get_cipherbyname(name);
    if (cipher == nullptr) {
      r = kErrOpenSSL;
      goto out;
    }

    if ((ctx_ = EVP_CIPHER_CTX_new()) == nullptr
        || EVP_DecryptInit_ex(ctx_, cipher, nullptr, nullptr, nullptr) != 1) {
      r = kErrOpenSSL;
      goto out;
    }

    if (iv_len != static_cast<size_t>(ctx_iv_len(ctx_))) {
      r = kErrBadIVLen;
      goto out;
    }

    if (key_len != static_cast<size_t>(ctx_key_len(ctx_))) {
      if (!EVP_CIPHER_CTX_set_key_length(ctx_, key_len)) {
        r = kErrBadKeyLen;
        goto out;
      }
    }

    // Set key and IV
    if (EVP_DecryptInit_ex(ctx_, nullptr, nullptr, key, iv) != 1) {
      r = kErrOpenSSL;
      goto out;
    }

    // Disable padding
    EVP_CIPHER_CTX_set_padding(ctx_, 0);

    if (cipher == EVP_rc4()) {
      /* The "arcfour128" algorithm is the RC4 cipher, as described in
         [SCHNEIER], using a 128-bit key.  The first 1536 bytes of keystream
         generated by the cipher MUST be discarded, and the first byte of the
         first encrypted packet MUST be encrypted using the 1537th byte of
         keystream.

         -- http://tools.ietf.org/html/rfc4345#section-4 */
      unsigned char zeros[1536] = {0};
      int outlen = sizeof(zeros);
      if (EVP_DecryptUpdate(ctx_,
                            zeros,
                            &outlen,
                            zeros,
                            sizeof(zeros)) != 1) {
        r = kErrOpenSSL;
        goto out;
      }
      if (static_cast<size_t>(outlen) != sizeof(zeros)) {
        r = kErrBadInit;
        goto out;
      }
    }

#if REAL_OPENSSL_MAJOR >= 3
    if ((mac_ = EVP_MAC_fetch(nullptr,
                              "HMAC",
                              "provider=default")) == nullptr) {
      r = kErrOpenSSL;
      goto out;
    }
    if ((mac_ctx_base_ = EVP_MAC_CTX_new(mac_)) == nullptr) {
      r = kErrOpenSSL;
      goto out;
    }
    params[0] = OSSL_PARAM_construct_utf8_string("digest",
                                                 const_cast<char*>(hmac_name),
                                                 0);
    params[1] = OSSL_PARAM_END;
    if (EVP_MAC_init(mac_ctx_base_, hmac_key, hmac_key_len, params) != 1) {
      EVP_MAC_CTX_free(mac_ctx_base_);
      r = kErrOpenSSL;
      goto out;
    }
    hmac_len_ = EVP_MAC_CTX_get_mac_size(mac_ctx_base_);
#else
    md = EVP_get_digestbyname(hmac_name);
    if (md == nullptr) {
      r = kErrBadHMACName;
      goto out;
    }

    if ((ctx_hmac_ = HMAC_CTX_new()) == nullptr
        || HMAC_Init_ex(ctx_hmac_, hmac_key, hmac_key_len, md, nullptr) != 1) {
      r = kErrOpenSSL;
      goto out;
    }

    hmac_len_ = HMAC_size(ctx_hmac_);
#endif
    hmac_actual_len_ = hmac_actual_len;
    is_etm_ = is_etm;
#if REAL_OPENSSL_MAJOR >= 3
    switch (EVP_CIPHER_CTX_mode(ctx_)) {
#else
    switch (cipher_flags(EVP_CIPHER_CTX_cipher(ctx_)) & EVP_CIPH_MODE) {
#endif
      case EVP_CIPH_STREAM_CIPHER:
      case EVP_CIPH_CTR_MODE:
        is_stream_ = 1;
        break;
      default:
        is_stream_ = 0;
    }
    block_size_ = ctx_get_block_size(ctx_);

out:
    return r;
  }

  ErrorType decrypt_block(unsigned char* data, uint32_t data_len) {
    ErrorType r = kErrNone;

    int outlen;

    if (!is_stream_ && data_len != block_size_) {
      r = kErrBadBlockLen;
      goto out;
    }

    // Decrypt block
    if (EVP_DecryptUpdate(ctx_, data, &outlen, data, data_len) != 1) {
      r = kErrOpenSSL;
      goto out;
    }
    if (static_cast<size_t>(outlen) != data_len) {
      r = kErrPartialDecrypt;
      goto out;
    }

out:
    return r;
  }

  ErrorType decrypt(unsigned char* packet,
                    uint32_t packet_len,
                    uint32_t seqno,
                    unsigned char* first_block,
                    uint32_t first_block_len,
                    unsigned char* mac,
                    uint32_t mac_len) {
    ErrorType r = kErrNone;

    int outlen;
    unsigned char calc_mac[MAX_MAC_LEN] = {0};

    uint8_t seqbuf[4] = {0};
    ((uint8_t*)(seqbuf))[0] = (seqno >> 24) & 0xff;
    ((uint8_t*)(seqbuf))[1] = (seqno >> 16) & 0xff;
    ((uint8_t*)(seqbuf))[2] = (seqno >> 8) & 0xff;
    ((uint8_t*)(seqbuf))[3] = seqno & 0xff;

    if (!is_etm_) {
      // `first_block` for non-ETM should be a completely decrypted first block
      if (!is_stream_ && first_block_len != block_size_) {
        r = kErrBadBlockLen;
        goto out;
      }

      const int offset = (is_stream_ ? 0 : block_size_ - 4);
      // Decrypt the rest of the packet
      if (EVP_DecryptUpdate(ctx_,
                            packet + offset,
                            &outlen,
                            packet + offset,
                            packet_len - offset) != 1) {
        r = kErrOpenSSL;
        goto out;
      }
      if (static_cast<size_t>(outlen) != packet_len - offset) {
        r = kErrPartialDecrypt;
        goto out;
      }
    }

    // Calculate and compare HMAC
    {
#if REAL_OPENSSL_MAJOR >= 3
      size_t outlen = hmac_len_;

      EVP_MAC_CTX* mac_ctx = EVP_MAC_CTX_dup(mac_ctx_base_);
      if (mac_ctx == nullptr) {
        r = kErrOpenSSL;
        goto out;
      }
      if (EVP_MAC_update(mac_ctx, seqbuf, sizeof(seqbuf)) != 1
          || EVP_MAC_update(mac_ctx, first_block, 4) != 1
          || EVP_MAC_update(mac_ctx, packet, packet_len) != 1
          || EVP_MAC_final(mac_ctx,
                           calc_mac,
                           &outlen,
                           outlen) != 1) {
        EVP_MAC_CTX_free(mac_ctx);
        r = kErrOpenSSL;
        goto out;
      }
      if (outlen != hmac_len_ || mac_len != hmac_actual_len_) {
        EVP_MAC_CTX_free(mac_ctx);
        r = kErrBadHMACLen;
        goto out;
      }
      EVP_MAC_CTX_free(mac_ctx);
#else
      unsigned int outlen = hmac_len_;
      if (HMAC_Init_ex(ctx_hmac_, nullptr, 0, nullptr, nullptr) != 1
          || HMAC_Update(ctx_hmac_, seqbuf, sizeof(seqbuf)) != 1
          || HMAC_Update(ctx_hmac_, first_block, 4) != 1
          || HMAC_Update(ctx_hmac_, packet, packet_len) != 1
          || HMAC_Final(ctx_hmac_, calc_mac, &outlen) != 1) {
        r = kErrOpenSSL;
        goto out;
      }
      if (outlen != hmac_len_ || mac_len != hmac_actual_len_) {
        r = kErrBadHMACLen;
        goto out;
      }
#endif

      // Compare MACs
      if (CRYPTO_memcmp(mac, calc_mac, hmac_actual_len_)) {
        r = kErrInvalidMAC;
        goto out;
      }
    }

    if (is_etm_) {
      // `first_block` for ETM should just be the unencrypted packet length
      if (first_block_len != 4) {
        r = kErrBadBlockLen;
        goto out;
      }

      // Decrypt packet
      if (EVP_DecryptUpdate(ctx_, packet, &outlen, packet, packet_len) != 1) {
        r = kErrOpenSSL;
        goto out;
      }
      if (static_cast<size_t>(outlen) != packet_len) {
        r = kErrPartialDecrypt;
        goto out;
      }
    }

out:
    return r;
  }

  static NAN_METHOD(New) {
    MarkPopErrorOnReturn mark_pop_error_on_return;

    if (!info[0]->IsString())
      return Nan::ThrowTypeError("Missing/Invalid decipher name");

    if (!Buffer::HasInstance(info[1]))
      return Nan::ThrowTypeError("Missing/Invalid decipher key");

    if (!Buffer::HasInstance(info[2]))
      return Nan::ThrowTypeError("Missing/Invalid decipher IV");

    if (!info[3]->IsString())
      return Nan::ThrowTypeError("Missing/Invalid HMAC name");

    if (!Buffer::HasInstance(info[4]))
      return Nan::ThrowTypeError("Missing/Invalid HMAC key");

    if (!info[5]->IsBoolean())
      return Nan::ThrowTypeError("Missing/Invalid HMAC ETM flag");

    if (!info[6]->IsUint32())
      return Nan::ThrowTypeError("Missing/Invalid HMAC ETM flag");

    const Nan::Utf8String cipher_name(info[0]);
    const Nan::Utf8String mac_name(info[3]);
    int is_etm = (Nan::To<bool>(info[5]).FromJust() ? 1 : 0);

    GenericDecipher* obj = new GenericDecipher();
    ErrorType r = obj->init(
      *cipher_name,
      reinterpret_cast<unsigned char*>(Buffer::Data(info[1])),
      Buffer::Length(info[1]),
      reinterpret_cast<unsigned char*>(Buffer::Data(info[2])),
      Buffer::Length(info[2]),
      *mac_name,
      reinterpret_cast<unsigned char*>(Buffer::Data(info[4])),
      Buffer::Length(info[4]),
      is_etm,
      Nan::To<uint32_t>(info[6]).FromJust()
    );
    if (r != kErrNone) {
      if (r == kErrOpenSSL) {
        char msg_buf[128] = {0};
        ERR_error_string_n(ERR_get_error(), msg_buf, sizeof(msg_buf));
        ERR_clear_error();
        obj->clear();
        delete obj;
        return Nan::ThrowError(msg_buf);
      }
      obj->clear();
      delete obj;
      switch (r) {
        case kErrBadKeyLen:
          return Nan::ThrowError("Invalid decipher key length");
        case kErrBadIVLen:
          return Nan::ThrowError("Invalid decipher IV length");
        case kErrBadCipherName:
          return Nan::ThrowError("Invalid decipher name");
        case kErrBadHMACName:
          return Nan::ThrowError("Invalid MAC name");
        case kErrBadInit:
          return Nan::ThrowError("Failed to properly initialize decipher");
        default:
          return Nan::ThrowError("Unknown init failure");
      }
    }

    obj->Wrap(info.This());
    info.GetReturnValue().Set(info.This());
  }

  static NAN_METHOD(DecryptBlock) {
    MarkPopErrorOnReturn mark_pop_error_on_return;

    GenericDecipher* obj = ObjectWrap::Unwrap<GenericDecipher>(info.Holder());

    if (!Buffer::HasInstance(info[0]))
      return Nan::ThrowTypeError("Missing/Invalid block");

    ErrorType r = obj->decrypt_block(
      reinterpret_cast<unsigned char*>(Buffer::Data(info[0])),
      Buffer::Length(info[0])
    );
    switch (r) {
      case kErrNone:
        return;
      case kErrBadBlockLen:
        return Nan::ThrowError("Invalid block length");
      case kErrPartialDecrypt:
        return Nan::ThrowError("Failed to completely decrypt packet");
      case kErrOpenSSL: {
        char msg_buf[128] = {0};
        ERR_error_string_n(ERR_get_error(), msg_buf, sizeof(msg_buf));
        ERR_clear_error();
        return Nan::ThrowError(msg_buf);
      }
      default:
        return Nan::ThrowError("Unknown decrypt failure");
    }
  }

  static NAN_METHOD(Decrypt) {
    MarkPopErrorOnReturn mark_pop_error_on_return;

    GenericDecipher* obj = ObjectWrap::Unwrap<GenericDecipher>(info.Holder());

    if (!Buffer::HasInstance(info[0]))
      return Nan::ThrowTypeError("Missing/Invalid packet");

    if (!info[1]->IsUint32())
      return Nan::ThrowTypeError("Missing/Invalid sequence number");

    if (!Buffer::HasInstance(info[2]))
      return Nan::ThrowTypeError("Missing/Invalid first block");

    if (!Buffer::HasInstance(info[3]))
      return Nan::ThrowTypeError("Missing/Invalid MAC");

    ErrorType r = obj->decrypt(
      reinterpret_cast<unsigned char*>(Buffer::Data(info[0])),
      Buffer::Length(info[0]),
      Nan::To<uint32_t>(info[1]).FromJust(),
      reinterpret_cast<unsigned char*>(Buffer::Data(info[2])),
      Buffer::Length(info[2]),
      reinterpret_cast<unsigned char*>(Buffer::Data(info[3])),
      Buffer::Length(info[3])
    );
    switch (r) {
      case kErrNone:
        return;
      case kErrBadBlockLen:
        return Nan::ThrowError("Invalid block length");
      case kErrPartialDecrypt:
        return Nan::ThrowError("Failed to completely decrypt packet");
      case kErrBadHMACLen:
        return Nan::ThrowError("Unexpected HMAC length");
      case kErrInvalidMAC:
        return Nan::ThrowError("Invalid MAC");
      case kErrOpenSSL: {
        char msg_buf[128] = {0};
        ERR_error_string_n(ERR_get_error(), msg_buf, sizeof(msg_buf));
        ERR_clear_error();
        return Nan::ThrowError(msg_buf);
      }
      default:
        return Nan::ThrowError("Unknown decrypt failure");
    }
  }

  static NAN_METHOD(Free) {
    GenericDecipher* obj = ObjectWrap::Unwrap<GenericDecipher>(info.Holder());
    obj->clear();
  }

  static inline v8::Eternal<v8::Function> & constructor() {
    static v8::Eternal<v8::Function> my_constructor;
    return my_constructor;
  }

  EVP_CIPHER_CTX* ctx_;
#if REAL_OPENSSL_MAJOR >= 3
  EVP_MAC* mac_;
  EVP_MAC_CTX* mac_ctx_base_;
  size_t hmac_len_;
#else
  HMAC_CTX* ctx_hmac_;
  unsigned int hmac_len_;
#endif
  unsigned int hmac_actual_len_;
  uint8_t is_etm_;
  uint8_t is_stream_;
  uint32_t block_size_;
};


NAN_MODULE_INIT(init) {
  // These are needed because node-gyp (as of this writing) does not use the
  // proper (OpenSSL) system headers when node was built against a shared
  // version of OpenSSL. Usually this isn't an issue because OSes that build
  // node in this way typically use the same version of OpenSSL as was bundled
  // with node for a particular node version for the best compatibility. However
  // with the inclusion of OpenSSL 3.x in node v17.x, some OSes are still
  // linking with a shared OpenSSL 1.x, which can cause both compilation and
  // runtime errors because of changes in OpenSSL's code.
  //
  // For that reason, we need to make sure we need to resolve some specific
  // symbols at runtime to workaround these buggy situations.
#ifdef _WIN32
#  define load_sym(name) GetProcAddress(GetModuleHandle(NULL), name)
#else
#  define load_sym(name) dlsym(RTLD_DEFAULT, name)
#endif
  if (!ctx_iv_len) {
    ctx_iv_len = reinterpret_cast<ctx_iv_len_func>(
      load_sym("EVP_CIPHER_CTX_get_iv_length")
    );
    if (!ctx_iv_len) {
      ctx_iv_len = reinterpret_cast<ctx_iv_len_func>(
        load_sym("EVP_CIPHER_CTX_iv_length")
      );
    }
  }
  if (!ctx_key_len) {
    ctx_key_len = reinterpret_cast<ctx_key_len_func>(
      load_sym("EVP_CIPHER_CTX_get_key_length")
    );
    if (!ctx_key_len) {
      ctx_key_len = reinterpret_cast<ctx_key_len_func>(
        load_sym("EVP_CIPHER_CTX_key_length")
      );
    }
  }
  if (!cipher_flags) {
    cipher_flags = reinterpret_cast<cipher_flags_func>(
      load_sym("EVP_CIPHER_get_flags")
    );
    if (!cipher_flags) {
      cipher_flags = reinterpret_cast<cipher_flags_func>(
        load_sym("EVP_CIPHER_flags")
      );
    }
  }
  if (!ctx_get_block_size) {
    ctx_get_block_size = reinterpret_cast<ctx_get_block_size_func>(
      load_sym("EVP_CIPHER_CTX_get_block_size")
    );
    if (!ctx_get_block_size) {
      ctx_get_block_size = reinterpret_cast<ctx_get_block_size_func>(
        load_sym("EVP_CIPHER_CTX_block_size")
      );
    }
  }

  ChaChaPolyCipher::Init(target);
  AESGCMCipher::Init(target);
  GenericCipher::Init(target);

  ChaChaPolyDecipher::Init(target);
  AESGCMDecipher::Init(target);
  GenericDecipher::Init(target);
}

DISABLE_WCAST_FUNCTION_TYPE
NAN_MODULE_WORKER_ENABLED(sshcrypto, init)
DISABLE_WCAST_FUNCTION_TYPE_END
