package client

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestNew(t *testing.T) {
	baseURL := "http://localhost:8080"
	cli := New(baseURL)

	if cli == nil {
		t.Fatal("expected client instance, got nil")
	}

	if cli.baseURL != baseURL {
		t.Errorf("expected baseURL %s, got %s", baseURL, cli.baseURL)
	}

	if cli.httpClient == nil {
		t.Error("expected httpClient to be set")
	}

	if cli.httpClient.Timeout != 10*time.Second {
		t.Errorf("expected timeout 10s, got %v", cli.httpClient.Timeout)
	}
}

func TestConnect(t *testing.T) {
	t.Run("successful connection", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/health" {
				w.WriteHeader(http.StatusOK)
			}
		}))
		defer server.Close()

		cli := New(server.URL)
		err := cli.Connect()

		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("unhealthy server", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
		}))
		defer server.Close()

		cli := New(server.URL)
		err := cli.Connect()

		if err == nil {
			t.Error("expected error for unhealthy server")
		}
	})

	t.Run("connection failure", func(t *testing.T) {
		cli := New("http://invalid-url-that-does-not-exist:99999")
		err := cli.Connect()

		if err == nil {
			t.Error("expected error for connection failure")
		}
	})
}

func TestGetUser(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	cli := New(server.URL)
	user, err := cli.GetUser(123)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if user == nil {
		t.Fatal("expected user, got nil")
	}

	if user.ID != 123 {
		t.Errorf("expected user ID 123, got %d", user.ID)
	}
}

func TestSetTimeout(t *testing.T) {
	cli := New("http://localhost")
	newTimeout := 30 * time.Second

	cli.SetTimeout(newTimeout)

	if cli.httpClient.Timeout != newTimeout {
		t.Errorf("expected timeout %v, got %v", newTimeout, cli.httpClient.Timeout)
	}
}

func TestGetBaseURL(t *testing.T) {
	baseURL := "http://example.com"
	cli := New(baseURL)

	if got := cli.GetBaseURL(); got != baseURL {
		t.Errorf("GetBaseURL() = %s; want %s", got, baseURL)
	}
}
