import secrets
import string


NANOID_CHARSET = string.ascii_uppercase + string.ascii_lowercase + string.digits
TARGET_NANOID_LEN = 22
CHARSET_LEN = len(NANOID_CHARSET)

# Collision probability is roughly k^2/(2n) where k=IDs generated, n=possibilities
# At 10^12 IDs generated with 62^22 possibilities -> ~1.8e-16 chance of collision


def nanoid() -> str:
    nanoid = ""

    while len(nanoid) < TARGET_NANOID_LEN:
        index = secrets.randbits(6)
        if index < CHARSET_LEN:
            nanoid += NANOID_CHARSET[index]

    return nanoid
