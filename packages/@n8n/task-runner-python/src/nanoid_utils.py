from nanoid.generate import generate
import string

NANOID_CHARSET = string.ascii_uppercase + string.ascii_lowercase + string.digits
NANOID_LENGTH = 21


def nanoid() -> str:
    return generate(NANOID_CHARSET, NANOID_LENGTH)
