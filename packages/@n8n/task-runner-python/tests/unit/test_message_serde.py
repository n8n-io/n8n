"""Unit tests for MessageSerde — JSON error handling."""

import json
import pytest

from message_serde import MessageSerde


class TestDeserializeBrokerMessageInvalidJson:
    def test_raises_value_error_on_empty_string(self):
        with pytest.raises(ValueError, match="Invalid JSON"):
            MessageSerde.deserialize_broker_message("")

    def test_raises_value_error_on_truncated_json(self):
        with pytest.raises(ValueError, match="Invalid JSON"):
            MessageSerde.deserialize_broker_message('{"type": "runner:taskoffer"')

    def test_raises_value_error_on_plain_text(self):
        with pytest.raises(ValueError, match="Invalid JSON"):
            MessageSerde.deserialize_broker_message("not json at all")

    def test_original_json_decode_error_is_chained(self):
        """ValueError must chain the original JSONDecodeError so callers can inspect it."""
        with pytest.raises(ValueError) as exc_info:
            MessageSerde.deserialize_broker_message("{{bad}}")
        assert exc_info.value.__cause__ is not None
        assert isinstance(exc_info.value.__cause__, json.JSONDecodeError)

    def test_valid_json_does_not_raise_on_json_decode(self):
        """Well-formed JSON must not raise ValueError from the JSON layer."""
        try:
            MessageSerde.deserialize_broker_message('{"type": "unknown_xyz"}')
        except ValueError as e:
            assert "Invalid JSON" not in str(e)
        except Exception:
            pass
