package server

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestNew(t *testing.T) {
	addr := ":8080"
	srv := New(addr)

	if srv == nil {
		t.Fatal("expected server instance, got nil")
	}

	if srv.addr != addr {
		t.Errorf("expected addr %s, got %s", addr, srv.addr)
	}

	if srv.handler == nil {
		t.Error("expected handler to be set")
	}
}

func TestGetAddress(t *testing.T) {
	addr := ":9090"
	srv := New(addr)

	if got := srv.GetAddress(); got != addr {
		t.Errorf("GetAddress() = %s; want %s", got, addr)
	}
}

func TestHandleHealth(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	handleHealth(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, resp.StatusCode)
	}

	body := w.Body.String()
	if !strings.Contains(body, "OK") {
		t.Errorf("expected body to contain 'OK', got %s", body)
	}
}

func TestHandleUsers(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/users", nil)
	w := httptest.NewRecorder()

	handleUsers(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, resp.StatusCode)
	}

	body := w.Body.String()
	if !strings.Contains(body, "User:") {
		t.Errorf("expected body to contain 'User:', got %s", body)
	}
	if !strings.Contains(body, "Test User") {
		t.Errorf("expected body to contain 'Test User', got %s", body)
	}
}
