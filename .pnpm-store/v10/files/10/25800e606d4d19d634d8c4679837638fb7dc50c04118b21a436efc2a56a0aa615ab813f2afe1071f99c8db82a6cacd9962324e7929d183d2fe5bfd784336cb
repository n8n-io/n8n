#include <windows.h>
#include <stdio.h>
#include <fcntl.h>

#define AGENT_COPYDATA_ID 0x804e50ba
#define AGENT_MAX_MSGLEN  8192

#define GET_32BIT_MSB_FIRST(cp) \
  (((unsigned long)(unsigned char)(cp)[0] << 24) | \
  ((unsigned long)(unsigned char)(cp)[1] << 16) | \
  ((unsigned long)(unsigned char)(cp)[2] << 8) | \
  ((unsigned long)(unsigned char)(cp)[3]))

#define GET_32BIT(cp) GET_32BIT_MSB_FIRST(cp)

#define RET_ERR_BADARGS 10
#define RET_ERR_UNAVAILABLE 11
#define RET_ERR_NOMAP 12
#define RET_ERR_BINSTDIN 13
#define RET_ERR_BINSTDOUT 14
#define RET_ERR_BADLEN 15

#define RET_NORESPONSE 1
#define RET_RESPONSE 0

int main (int argc, const char* argv[]) {
  HWND hwnd;
  char *mapname;
  HANDLE filemap;
  unsigned char *p, *ret;
  int id, retlen, inlen, n, rmode, r = RET_NORESPONSE;
  COPYDATASTRUCT cds;
  void *in;

  if (argc < 2)
    return RET_ERR_BADARGS;

  hwnd = FindWindow("Pageant", "Pageant");
  if (!hwnd)
    return RET_ERR_UNAVAILABLE;

  rmode = _setmode(_fileno(stdin), _O_BINARY);
  if (rmode == -1)
    return RET_ERR_BINSTDIN;

  rmode = _setmode(_fileno(stdout), _O_BINARY);
  if (rmode == -1)
    return RET_ERR_BINSTDOUT;

  inlen = atoi(argv[1]);
  in = malloc(inlen);
  n = fread(in, 1, inlen, stdin);
  if (n != inlen) {
    free(in);
    return RET_ERR_BADLEN;
  }

  mapname = malloc(32);
  n = sprintf(mapname, "PageantRequest%08x", (unsigned)GetCurrentThreadId());

  filemap = CreateFileMapping(INVALID_HANDLE_VALUE, NULL, PAGE_READWRITE,
                              0, AGENT_MAX_MSGLEN, mapname);
  if (filemap == NULL || filemap == INVALID_HANDLE_VALUE) {
    free(in);
    free(mapname);
    return RET_ERR_NOMAP;
  }

  p = MapViewOfFile(filemap, FILE_MAP_WRITE, 0, 0, 0);
  memcpy(p, in, inlen);
  cds.dwData = AGENT_COPYDATA_ID;
  cds.cbData = 1 + n;
  cds.lpData = mapname;

  id = SendMessage(hwnd, WM_COPYDATA, (WPARAM) NULL, (LPARAM) &cds);
  if (id > 0) {
    r = RET_RESPONSE;
    retlen = 4 + GET_32BIT(p);
    fwrite(p, 1, retlen, stdout);
  }

  free(in);
  free(mapname);
  UnmapViewOfFile(p);
  CloseHandle(filemap);

  return r;
}
