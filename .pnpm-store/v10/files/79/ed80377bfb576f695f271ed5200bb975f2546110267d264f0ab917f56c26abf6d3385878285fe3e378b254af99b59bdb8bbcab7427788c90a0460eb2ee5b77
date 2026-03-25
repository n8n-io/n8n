// http://web.archive.org/web/20140401031018/http://rjpower9000.wordpress.com:80/2012/04/09/fun-with-shared-libraries-version-glibc_2-14-not-found/

#if defined(__linux__)

#define _GNU_SOURCE
#include <features.h>
#undef _GNU_SOURCE

#if defined(__USE_GNU)

#if defined(__x86_64__)
__asm__(".symver memcpy,memcpy@GLIBC_2.2.5");
__asm__(".symver exp,exp@GLIBC_2.2.5");
__asm__(".symver log,log@GLIBC_2.2.5");
__asm__(".symver log2,log2@GLIBC_2.2.5");
__asm__(".symver pow,pow@GLIBC_2.2.5");
__asm__(".symver fcntl64,fcntl@GLIBC_2.2.5");
#endif

#if defined(__aarch64__) || defined(_M_ARM64)
__asm__(".symver memcpy,memcpy@GLIBC_2.17");
__asm__(".symver exp,exp@GLIBC_2.17");
__asm__(".symver log,log@GLIBC_2.17");
__asm__(".symver log2,log2@GLIBC_2.17");
__asm__(".symver pow,pow@GLIBC_2.17");
__asm__(".symver fcntl64,fcntl@GLIBC_2.17");
#endif

#endif
#endif
