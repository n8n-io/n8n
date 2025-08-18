from nanoid.generate import generate

NANOID_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"


def nanoid() -> str:
    return generate(alphabet=NANOID_CHARSET, size=16)
