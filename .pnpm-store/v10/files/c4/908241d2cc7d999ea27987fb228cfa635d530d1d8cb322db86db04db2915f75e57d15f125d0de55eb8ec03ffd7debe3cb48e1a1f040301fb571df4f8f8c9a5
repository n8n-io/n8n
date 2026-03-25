#ifndef __LIBADAPTERS_H__
#define __LIBADAPTERS_H__

// Declarations for synchronous and asynchronous JavaScript relay methods.
// The function name contains the C signature of the JavaScript function.
// The first two arguments of each relay method is the target (e.g. VFS)
// and method name (e.g. xOpen) to call. The remaining arguments are the
// parameters to the method.
//
// Relaying is necessary because Emscripten only allows calling a statically
// defined JavaScript function via a C function pointer.
#define P const void*
#define I int
#define J int64_t
#define DECLARE(TYPE, NAME, ...) \
  extern TYPE NAME(__VA_ARGS__); \
  extern TYPE NAME##_async(__VA_ARGS__);

DECLARE(I, ipp, P, P);
DECLARE(I, ippp, P, P, P);
DECLARE(void, vppp, P, P, P);
DECLARE(I, ipppj, P, P, P, J);
DECLARE(I, ipppi, P, P, P, I);
DECLARE(I, ipppp, P, P, P, P);
DECLARE(I, ipppip, P, P, P, I, P);
DECLARE(void, vpppip, P, P, P, I, P);
DECLARE(I, ippppi, P, P, P, P, I);
DECLARE(I, ipppiii, P, P, P, I, I, I);
DECLARE(I, ippppij, P, P, P, P, I, J);
DECLARE(I, ippppip, P, P, P, P, I, P);
DECLARE(I, ippipppp, P, P, I, P, P, P, P);
DECLARE(I, ipppppip, P, P, P, P, P, I, P);
DECLARE(I, ipppiiip, P, P, P, I, I, I, P);
DECLARE(void, vppippii, P, P, I, P, P, I, I);
#undef DECLARE
#undef P
#undef I
#undef J

#endif