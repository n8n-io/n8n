# Pydantic V2 Schemas

## Schema Patterns

```python
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import Self

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    username: str = Field(min_length=3, max_length=50)
    age: int = Field(ge=18, le=120)

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain uppercase')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain digit')
        return v

    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not v.isalnum():
            raise ValueError('Username must be alphanumeric')
        return v.lower()

class UserUpdate(BaseModel):
    email: EmailStr | None = None
    username: str | None = Field(None, min_length=3, max_length=50)
```

## ORM Mode (from_attributes)

```python
class UserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    email: EmailStr
    username: str
    is_active: bool = True
    created_at: datetime

# Usage with SQLAlchemy model
user_response = UserResponse.model_validate(db_user)
```

## Model Validator

```python
class OrderCreate(BaseModel):
    items: list[OrderItem]
    discount_code: str | None = None
    total: float

    @model_validator(mode='after')
    def validate_order(self) -> Self:
        calculated = sum(item.price * item.quantity for item in self.items)
        if abs(self.total - calculated) > 0.01:
            raise ValueError('Total does not match items')
        return self
```

## Nested Models

```python
class Address(BaseModel):
    street: str
    city: str
    country: str = Field(default="US")

class UserWithAddress(BaseModel):
    name: str
    addresses: list[Address] = Field(default_factory=list)
```

## Serialization Control

```python
class User(BaseModel):
    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {"email": "user@example.com", "username": "johndoe"}
        }
    }

    id: int
    email: EmailStr
    password: str = Field(exclude=True)  # Never serialize
    internal_id: str = Field(repr=False)  # Hide from repr

# Serialize with aliases
class ApiResponse(BaseModel):
    model_config = {"populate_by_name": True}

    user_id: int = Field(alias="userId", serialization_alias="user_id")
```

## Settings (Pydantic V2)

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    DATABASE_URL: str
    SECRET_KEY: str
    DEBUG: bool = False
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    API_V1_PREFIX: str = "/api/v1"

settings = Settings()
```

## Quick Reference

| V1 Syntax | V2 Syntax |
|-----------|-----------|
| `@validator` | `@field_validator` |
| `@root_validator` | `@model_validator` |
| `class Config` | `model_config = {}` |
| `orm_mode = True` | `from_attributes = True` |
| `Optional[X]` | `X \| None` |
| `.dict()` | `.model_dump()` |
| `.parse_obj()` | `.model_validate()` |
