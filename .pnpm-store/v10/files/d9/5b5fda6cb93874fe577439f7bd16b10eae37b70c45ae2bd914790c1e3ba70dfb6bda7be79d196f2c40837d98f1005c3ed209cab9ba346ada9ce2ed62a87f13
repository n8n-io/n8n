#ifndef NODE_SQLITE3_SRC_THREADING_H
#define NODE_SQLITE3_SRC_THREADING_H

#define NODE_SQLITE3_MUTEX_t uv_mutex_t mutex;
#define NODE_SQLITE3_MUTEX_INIT uv_mutex_init(&mutex);
#define NODE_SQLITE3_MUTEX_LOCK(m) uv_mutex_lock(m);
#define NODE_SQLITE3_MUTEX_UNLOCK(m) uv_mutex_unlock(m);
#define NODE_SQLITE3_MUTEX_DESTROY uv_mutex_destroy(&mutex);

#endif // NODE_SQLITE3_SRC_THREADING_H
